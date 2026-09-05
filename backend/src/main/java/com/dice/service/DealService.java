package com.dice.service;

import com.dice.domain.*;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.DecisionOutcome;
import com.dice.engine.approval.ApprovalEngine;
import com.dice.engine.decision.DecisionResolver;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.*;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Owns the deal lifecycle. Everything that changes a deal goes through here so
 * that pricing, evaluation and the audit trail stay in step.
 *
 * <p>The important method is {@link #evaluate}: it runs the engines, persists an
 * {@link Evaluation} + {@link Decision}, opens any {@link Approval}s the outcome
 * demands, and moves the deal's status. Call it after any commercial change.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DealService {

    private final DealRepository dealRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final PolicyRepository policyRepository;
    private final EvaluationRepository evaluationRepository;
    private final DecisionRepository decisionRepository;
    private final ApprovalRepository approvalRepository;

    private final PricingService pricingService;
    private final DecisionResolver decisionResolver;
    private final EventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<Deal> list(Pageable pageable) {
        return dealRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Deal> listByStatus(DealStatus status, Pageable pageable) {
        return dealRepository.findByStatus(status, pageable);
    }

    /** Loads a deal with its lines and products already fetched. */
    @Transactional(readOnly = true)
    public Deal require(UUID dealId) {
        return dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));
    }

    @Transactional(readOnly = true)
    public List<Evaluation> history(UUID dealId) {
        return evaluationRepository.findByDealIdOrderByCreatedAtDesc(dealId);
    }

    // ------------------------------------------------------------------
    // Writes
    // ------------------------------------------------------------------

    /**
     * Creates a draft deal and immediately evaluates it, so the caller gets a
     * decision back rather than an empty shell.
     */
    public Deal create(UUID customerId,
                       List<LineRequest> lines,
                       LocalDate requestedDeliveryDate,
                       String actor) {

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("No customer with id " + customerId));

        Deal deal = Deal.builder()
                .dealNumber(nextDealNumber())
                .customer(customer)
                .status(DealStatus.DRAFT)
                .requestedDeliveryDate(requestedDeliveryDate)
                .ownerUsername(actor)
                .build();

        int lineNumber = 1;
        for (LineRequest request : lines) {
            deal.addLine(toLine(request, lineNumber++));
        }

        pricingService.recalculate(deal);
        Deal saved = dealRepository.save(deal);

        eventPublisher.publish(DealEvent.Type.DEAL_CREATED, saved.getId(), actor,
                Map.of("dealNumber", saved.getDealNumber(), "lineCount", lines.size()));

        return evaluate(saved.getId(), DealEvent.Type.DEAL_CREATED, actor);
    }

    /** Replaces the deal's lines wholesale, then re-evaluates. */
    public Deal replaceLines(UUID dealId, List<LineRequest> lines, String actor) {
        Deal deal = require(dealId);
        assertMutable(deal);

        deal.getLines().clear();
        int lineNumber = 1;
        for (LineRequest request : lines) {
            deal.addLine(toLine(request, lineNumber++));
        }

        pricingService.recalculate(deal);
        dealRepository.save(deal);

        eventPublisher.publish(DealEvent.Type.QUANTITY_CHANGED, dealId, actor,
                Map.of("lineCount", lines.size()));

        return evaluate(dealId, DealEvent.Type.QUANTITY_CHANGED, actor);
    }

    /** Applies a flat discount across every line, then re-evaluates. */
    public Deal applyDiscount(UUID dealId, BigDecimal discountPercent, String actor) {
        Deal deal = require(dealId);
        assertMutable(deal);

        deal.getLines().forEach(line -> line.setDiscountPercent(discountPercent));
        pricingService.recalculate(deal);
        dealRepository.save(deal);

        eventPublisher.publish(DealEvent.Type.DISCOUNT_CHANGED, dealId, actor,
                Map.of("discountPercent", discountPercent));

        return evaluate(dealId, DealEvent.Type.DISCOUNT_CHANGED, actor);
    }

    /**
     * Runs the engines and records the outcome.
     *
     * <p>Idempotent in the sense that re-running produces a fresh evaluation
     * rather than corrupting state — the trail is append-only by design.
     */
    public Deal evaluate(UUID dealId, String triggeredBy, String actor) {
        Deal deal = require(dealId);

        var context = DecisionResolver.Context.of(
                policyRepository.findByActiveTrueOrderByPriorityAsc(),
                productRepository.findByActiveTrue());

        DecisionResolver.Resolution resolution = decisionResolver.resolve(deal, context);

        Evaluation evaluation = evaluationRepository.save(Evaluation.builder()
                .deal(deal)
                .triggeredBy(triggeredBy)
                .marginPercent(resolution.margin().marginPercent())
                .discountPercent(deal.effectiveDiscountPercent())
                .riskLevel(resolution.risk().level())
                .healthScore(resolution.health().score())
                .outcome(resolution.outcome())
                .policyResults(toJson(resolution.policies().violations()))
                .build());

        decisionRepository.save(Decision.builder()
                .deal(deal)
                .evaluation(evaluation)
                .outcome(resolution.outcome())
                .rationale(resolution.rationale())
                .recommendations(toJson(resolution.recommendations()))
                .build());

        openApprovals(deal, evaluation, resolution.approvals(), actor);

        deal.setMarginPercent(resolution.margin().marginPercent());
        deal.setRiskLevel(resolution.risk().level());
        deal.setHealthScore(resolution.health().score());
        deal.setStatus(statusFor(resolution.outcome()));
        Deal saved = dealRepository.save(deal);

        eventPublisher.publish(DealEvent.Type.DEAL_EVALUATED, dealId, actor,
                Map.of("outcome", resolution.outcome().name(),
                        "healthScore", resolution.health().score()));

        return saved;
    }

    /**
     * Raises one approval per requirement, skipping roles that already have a
     * pending request — re-evaluating a deal should not spam approvers.
     */
    private void openApprovals(Deal deal,
                               Evaluation evaluation,
                               List<ApprovalEngine.Requirement> requirements,
                               String actor) {
        List<Approval> existing = approvalRepository.findByDealIdOrderByRequestedAtDesc(deal.getId());

        for (ApprovalEngine.Requirement requirement : requirements) {
            boolean alreadyPending = existing.stream()
                    .anyMatch(a -> a.getStatus() == ApprovalStatus.PENDING
                            && a.getRequiredRole().equals(requirement.role().name()));
            if (alreadyPending) {
                continue;
            }

            Approval approval = approvalRepository.save(Approval.builder()
                    .deal(deal)
                    .evaluation(evaluation)
                    .policyCode(String.join(",", requirement.policyCodes()))
                    .requiredRole(requirement.role().name())
                    .status(ApprovalStatus.PENDING)
                    .requestedBy(actor)
                    .reason(requirement.reason())
                    .slaDueAt(requirement.slaDueAt())
                    .build());

            eventPublisher.publish(DealEvent.Type.APPROVAL_REQUESTED, deal.getId(), actor,
                    Map.of("approvalId", approval.getId(), "role", requirement.role().name()));
        }
    }

    /** Where the deal lands once the engines have spoken. */
    private DealStatus statusFor(DecisionOutcome outcome) {
        return switch (outcome) {
            case AUTO_APPROVE -> DealStatus.APPROVED;
            case REQUIRE_APPROVAL -> DealStatus.PENDING_APPROVAL;
            case BLOCK -> DealStatus.REJECTED;
            case RECOMMEND_ALTERNATIVE -> DealStatus.IN_NEGOTIATION;
        };
    }

    private void assertMutable(Deal deal) {
        if (deal.getStatus() == DealStatus.CONFIRMED
                || deal.getStatus() == DealStatus.FULFILLED
                || deal.getStatus() == DealStatus.INVOICED
                || deal.getStatus() == DealStatus.CANCELLED) {
            throw new IllegalStateException(
                    "Deal %s is %s and can no longer be edited"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }
    }

    private DealLine toLine(LineRequest request, int lineNumber) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No product with id " + request.productId()));

        return DealLine.builder()
                .product(product)
                .lineNumber(lineNumber)
                .quantity(request.quantity())
                .unitPrice(request.unitPrice() == null ? product.getListPrice() : request.unitPrice())
                .discountPercent(request.discountPercent() == null
                        ? BigDecimal.ZERO : request.discountPercent())
                .build();
    }

    /**
     * Sequential reference derived from the row count. Fine for a demo; swap for
     * a database sequence before anything concurrent hits it.
     */
    private String nextDealNumber() {
        return "DICE-%06d".formatted(dealRepository.count() + 1);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException e) {
            log.warn("Could not serialise {}: {}", value.getClass().getSimpleName(), e.getMessage());
            return "[]";
        }
    }

    /** Inbound shape for creating or replacing a line. */
    public record LineRequest(
            UUID productId,
            Integer quantity,
            /** Null falls back to the product's list price. */
            BigDecimal unitPrice,
            BigDecimal discountPercent) {
    }
}
