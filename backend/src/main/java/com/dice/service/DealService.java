package com.dice.service;

import com.dice.domain.*;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.DecisionOutcome;
import com.dice.domain.enums.QuotationDecision;
import com.dice.engine.approval.ApprovalEngine;
import com.dice.engine.approval.LineSnapshot;
import com.dice.engine.approval.MaterialChangeDetector;
import com.dice.engine.decision.DecisionResolver;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.*;
import com.dice.security.Role;
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
import java.util.Optional;
import java.util.UUID;

/**
 * Owns the deal lifecycle. Everything that changes a deal goes through here so
 * that pricing, evaluation and the audit trail stay in step.
 *
 * <p>The important method is {@link #evaluate}: it runs the engines, persists an
 * {@link Evaluation} + {@link Decision}, opens any {@link Approval}s the outcome
 * demands (both the per-policy-violation kind and, via {@link ApprovalService},
 * the sequential quotation chain), and moves the deal's status. Call it after
 * any commercial change.
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
    private final ApprovalSnapshotRepository approvalSnapshotRepository;

    private final PricingService pricingService;
    private final DecisionResolver decisionResolver;
    private final ApprovalEngine approvalEngine;
    private final ApprovalService approvalService;
    private final MaterialChangeDetector materialChangeDetector;
    private final DiscountAnomalyService discountAnomalyService;
    private final EventPublisher eventPublisher;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    // ------------------------------------------------------------------
    // Reads
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<Deal> list(Pageable pageable) {
        return dealRepository.findAllWithCustomer(pageable);
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

        int oldLineCount = deal.getLines().size();
        deal.getLines().clear();
        int lineNumber = 1;
        for (LineRequest request : lines) {
            deal.addLine(toLine(request, lineNumber++));
        }

        pricingService.recalculate(deal);
        dealRepository.save(deal);

        // Audit the quotation edit with before/after line counts.
        auditService.record(
                AuditService.DEAL, dealId,
                AuditService.QUOTATION_EDITED, actor,
                "lines=%d".formatted(oldLineCount),
                "lines=%d".formatted(lines.size()),
                null);

        eventPublisher.publish(DealEvent.Type.QUANTITY_CHANGED, dealId, actor,
                Map.of("lineCount", lines.size()));

        return evaluate(dealId, DealEvent.Type.QUANTITY_CHANGED, actor);
    }

    /** Applies a flat discount across every line, then re-evaluates. */
    public Deal applyDiscount(UUID dealId, BigDecimal discountPercent, String actor) {
        Deal deal = require(dealId);
        assertMutable(deal);

        BigDecimal oldDiscount = deal.effectiveDiscountPercent();

        deal.getLines().forEach(line -> line.setDiscountPercent(discountPercent));
        pricingService.recalculate(deal);
        dealRepository.save(deal);

        // Audit the discount change with authoritative old/new values from backend state.
        auditService.record(
                AuditService.DEAL, dealId,
                AuditService.DISCOUNT_CHANGED, actor,
                oldDiscount.toPlainString() + "%",
                discountPercent.toPlainString() + "%",
                null);

        eventPublisher.publish(DealEvent.Type.DISCOUNT_CHANGED, dealId, actor,
                Map.of("discountPercent", discountPercent));

        return evaluate(dealId, DealEvent.Type.DISCOUNT_CHANGED, actor);
    }

    /**
     * Runs the engines and records the outcome.
     *
     * <p>Idempotent in the sense that re-running produces a fresh evaluation
     * rather than corrupting state — the trail is append-only by design.
     *
     * <p>After the engines resolve a fresh outcome from current state alone,
     * this checks it against any still-active {@link ApprovalSnapshot} — the
     * engines have no notion of "previously approved," so a deal that changed
     * after being signed off would otherwise silently re-clear. See
     * {@link #checkMaterialChange} and docs/decision-contract.md. When a
     * material change invalidates the snapshot, any still-pending sequential
     * approval steps are also withdrawn ({@link ApprovalService#invalidatePriorApprovals}) —
     * a prior sign-off must not cover a state that no longer exists.
     */
    public Deal evaluate(UUID dealId, String triggeredBy, String actor) {
        Deal deal = require(dealId);

        var context = DecisionResolver.Context.of(
                policyRepository.findByActiveTrueOrderByPriorityAsc(),
                productRepository.findByActiveTrue());

        DecisionResolver.Resolution resolution = decisionResolver.resolve(deal, context);

        // Rule-based discount anomaly check (commit 23) — baseline comes from
        // evaluation history strictly before this run, so it runs before the
        // new Evaluation row below is persisted. Persists/resolves an alert
        // but never blocks the evaluation itself.
        discountAnomalyService.evaluate(deal);

        ReapprovalOverlay overlay = checkMaterialChange(deal, resolution, actor);
        DecisionOutcome finalOutcome = overlay == null ? resolution.outcome() : overlay.outcome();
        String finalRationale = overlay == null ? resolution.rationale() : overlay.rationale();
        DecisionResolver.QuotationDecisionResult quotationDecision =
                patchQuotationDecision(resolution.quotationDecision(), overlay);

        Evaluation evaluation = evaluationRepository.save(Evaluation.builder()
                .deal(deal)
                .triggeredBy(triggeredBy)
                .marginPercent(resolution.margin().marginPercent())
                .discountPercent(deal.effectiveDiscountPercent())
                .riskScore(resolution.risk().score())
                .riskLevel(resolution.risk().level())
                .healthScore(resolution.health().score())
                .outcome(finalOutcome)
                .policyResults(toJson(resolution.policies().violations()))
                .build());

        decisionRepository.save(Decision.builder()
                .deal(deal)
                .evaluation(evaluation)
                .outcome(finalOutcome)
                .rationale(finalRationale)
                .recommendations(toJson(resolution.recommendations()))
                .build());

        openApprovals(deal, evaluation, resolution.approvals(), actor);
        if (overlay != null && overlay.opensApproval()) {
            openReapprovalRequest(deal, evaluation, overlay.approverRole(), actor);
        }
        approvalService.ensureSequentialApproval(deal, evaluation, quotationDecision);

        deal.setMarginPercent(resolution.margin().marginPercent());
        deal.setRiskScore(resolution.risk().score());
        deal.setRiskLevel(resolution.risk().level());
        deal.setHealthScore(resolution.health().score());
        deal.setStatus(statusFor(finalOutcome));
        Deal saved = dealRepository.save(deal);

        eventPublisher.publish(DealEvent.Type.DEAL_EVALUATED, dealId, actor,
                Map.of("outcome", finalOutcome.name(),
                        "healthScore", resolution.health().score()));

        return saved;
    }

    /**
     * Reflects a material-change overlay into the DealFlow360-facing decision
     * shape too, so {@code ApprovalService#ensureSequentialApproval} sees the
     * same "needs reapproval" signal as {@link DecisionOutcome} does — one
     * source of truth ({@link #checkMaterialChange}), two vocabularies fed
     * from it, never two independent detections.
     */
    private DecisionResolver.QuotationDecisionResult patchQuotationDecision(
            DecisionResolver.QuotationDecisionResult original, ReapprovalOverlay overlay) {
        if (overlay == null || overlay.outcome() != DecisionOutcome.REAPPROVAL_REQUIRED) {
            return original;
        }
        return new DecisionResolver.QuotationDecisionResult(
                QuotationDecision.REAPPROVAL_REQUIRED,
                original.riskScore(),
                true,
                original.requiredApprovals(),
                "WAIT_FOR_" + overlay.approverRole().name(),
                original.reasons());
    }

    /**
     * Compares the deal against its last granted approval snapshot, if any.
     * When it has drifted materially:
     * <ul>
     *   <li>the snapshot is superseded (kept, not deleted — the audit record of
     *       what was actually approved) and any pending sequential-chain
     *       approvals are withdrawn, both audited;</li>
     *   <li>if the fresh policy check would otherwise silently clear the deal
     *       ({@code AUTO_APPROVE}/{@code RECOMMEND_ALTERNATIVE}), the outcome is
     *       upgraded to {@code REAPPROVAL_REQUIRED} and a fresh approval is
     *       opened, addressed back to whoever approved it last time;</li>
     *   <li>otherwise ({@code REQUIRE_APPROVAL}/{@code BLOCK}) the fresh outcome
     *       already forces a human to look again, so it's left as-is — just
     *       annotated with the fact that it also invalidated the old approval.</li>
     * </ul>
     *
     * @return null when there is no active snapshot, or no material change
     */
    private ReapprovalOverlay checkMaterialChange(Deal deal, DecisionResolver.Resolution resolution, String actor) {
        Optional<ApprovalSnapshot> activeSnapshot =
                approvalSnapshotRepository.findByDealIdAndSupersededFalse(deal.getId());
        if (activeSnapshot.isEmpty()) {
            return null;
        }
        ApprovalSnapshot snapshot = activeSnapshot.get();

        List<LineSnapshot> snapshotLines = parseLineSnapshot(snapshot);
        List<LineSnapshot> currentLines = LineSnapshot.of(deal.getLines());
        MaterialChangeDetector.Result changeResult = materialChangeDetector.detect(
                snapshot, deal, resolution.risk().level(), snapshotLines, currentLines,
                deal.getCustomer().getPaymentTermsDays());

        if (!changeResult.material()) {
            return null;
        }

        String changeSummary = String.join("; ", changeResult.changedFields());
        snapshot.supersede(changeSummary);
        approvalSnapshotRepository.save(snapshot);
        approvalService.invalidatePriorApprovals(deal, changeSummary);
        auditService.record(AuditService.DEAL, deal.getId(),
                "MATERIAL_CHANGE_DETECTED", actor, null, null, changeSummary);

        boolean wouldSilentlyClear = resolution.outcome() == DecisionOutcome.AUTO_APPROVE
                || resolution.outcome() == DecisionOutcome.RECOMMEND_ALTERNATIVE;

        if (!wouldSilentlyClear) {
            String rationale = resolution.rationale()
                    + "\n(Note: this change also invalidates the approval %s granted by %s — changed: %s)"
                            .formatted(snapshot.getCapturedAt(), snapshot.getApprovedByRole(), changeSummary);
            return new ReapprovalOverlay(resolution.outcome(), rationale, false, null);
        }

        Role approverRole = parseRoleOrDefault(snapshot.getApprovedByRole());
        String rationale = "Previously approved by %s on %s, but the deal changed since: %s. Needs reconfirmation before it can proceed."
                .formatted(snapshot.getApprovedByRole(), snapshot.getCapturedAt(), changeSummary);
        return new ReapprovalOverlay(DecisionOutcome.REAPPROVAL_REQUIRED, rationale, true, approverRole);
    }

    /**
     * Raises the reapproval request a material change demands. Not driven by
     * {@code ApprovalEngine.Requirement} like {@link #openApprovals} — there is
     * no policy violation behind it, only "this changed after someone signed
     * off on it" — so it's built directly.
     */
    private void openReapprovalRequest(Deal deal, Evaluation evaluation, Role approverRole, String actor) {
        boolean alreadyPending = approvalRepository.findByDealIdOrderByRequestedAtDesc(deal.getId()).stream()
                .anyMatch(a -> a.getStatus() == ApprovalStatus.PENDING
                        && a.getRequiredRole().equals(approverRole.name()));
        if (alreadyPending) {
            return;
        }

        Approval approval = approvalRepository.save(Approval.builder()
                .deal(deal)
                .evaluation(evaluation)
                .policyCode("MATERIAL_CHANGE")
                .requiredRole(approverRole.name())
                .status(ApprovalStatus.PENDING)
                .requestedBy(actor)
                .reason("Deal changed after approval; reconfirmation required.")
                .slaDueAt(approvalEngine.slaDueFor(approverRole))
                .build());

        eventPublisher.publish(DealEvent.Type.APPROVAL_REQUESTED, deal.getId(), actor,
                Map.of("approvalId", approval.getId(), "role", approverRole.name(),
                        "reason", "MATERIAL_CHANGE"));
    }

    private List<LineSnapshot> parseLineSnapshot(ApprovalSnapshot snapshot) {
        try {
            return List.of(objectMapper.readValue(snapshot.getLineSnapshot(), LineSnapshot[].class));
        } catch (JacksonException e) {
            log.warn("Could not parse approval snapshot lines for deal {}: {}",
                    snapshot.getDeal().getId(), e.getMessage());
            return List.of();
        }
    }

    private Role parseRoleOrDefault(String raw) {
        try {
            return Role.valueOf(raw);
        } catch (IllegalArgumentException e) {
            return Role.SALES_MANAGER;
        }
    }

    /**
     * @param opensApproval true only when {@code outcome} is {@code REAPPROVAL_REQUIRED}
     *                       — the other branch (REQUIRE_APPROVAL/BLOCK) already
     *                       opens its own approval via {@link #openApprovals}
     */
    private record ReapprovalOverlay(DecisionOutcome outcome, String rationale,
                                     boolean opensApproval, Role approverRole) {
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
            case REQUIRE_APPROVAL, REAPPROVAL_REQUIRED -> DealStatus.PENDING_APPROVAL;
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
