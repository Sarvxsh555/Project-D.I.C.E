package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Negotiation;
import com.dice.domain.NegotiationMessage;
import com.dice.domain.NegotiationVersion;
import com.dice.domain.NegotiationVersionItem;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.NegotiationVersionStatus;
import com.dice.engine.decision.DecisionResolver;
import com.dice.engine.recommendation.RecommendationEngine;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.repository.NegotiationMessageRepository;
import com.dice.repository.NegotiationRepository;
import com.dice.repository.NegotiationVersionRepository;
import com.dice.repository.PolicyRepository;
import com.dice.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Customer-facing negotiation: counter-offers in, guidance out.
 *
 * <p>A counter-offer is evaluated <em>without being committed</em> first, so the
 * rep can see what accepting it would do before it changes the live deal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NegotiationService {

    private final DealRepository dealRepository;
    private final PolicyRepository policyRepository;
    private final ProductRepository productRepository;
    private final DealService dealService;
    private final PricingService pricingService;
    private final DecisionResolver decisionResolver;
    private final EventPublisher eventPublisher;
    private final NegotiationRepository negotiationRepository;
    private final NegotiationVersionRepository negotiationVersionRepository;
    private final NegotiationMessageRepository negotiationMessageRepository;
    private final AuditService auditService;

    /**
     * Scores a proposed discount against the live deal without persisting it.
     *
     * <p>Mutates the managed entity in memory and relies on the surrounding
     * read-only transaction never flushing — hence {@code readOnly = true}, which
     * is load-bearing here, not decoration.
     */
    @Transactional(readOnly = true)
    public Preview preview(UUID dealId, BigDecimal proposedDiscountPercent) {
        Deal deal = dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));

        BigDecimal originalTotal = deal.getTotalAmount();

        deal.getLines().forEach(line -> line.setDiscountPercent(proposedDiscountPercent));
        pricingService.recalculate(deal);

        var context = DecisionResolver.Context.of(
                policyRepository.findByActiveTrueOrderByPriorityAsc(),
                productRepository.findByActiveTrue());
        DecisionResolver.Resolution resolution = decisionResolver.resolve(deal, context);

        return new Preview(
                proposedDiscountPercent,
                originalTotal,
                deal.getTotalAmount(),
                resolution.margin().marginPercent(),
                resolution.outcome(),
                resolution.rationale(),
                resolution.recommendations(),
                floorDiscount(deal));
    }

    /** Accepts a counter-offer, applying it to the deal and re-evaluating. */
    public Deal acceptCounterOffer(UUID dealId, BigDecimal discountPercent, String actor) {
        eventPublisher.publish(DealEvent.Type.COUNTER_OFFER, dealId, actor,
                Map.of("discountPercent", discountPercent));

        Deal deal = dealService.applyDiscount(dealId, discountPercent, actor);
        if (deal.getStatus() == DealStatus.DRAFT) {
            deal.setStatus(DealStatus.IN_NEGOTIATION);
        }
        return deal;
    }

    // ------------------------------------------------------------------
    // Negotiation versioning (Commits 15-16): every counter-offer creates a
    // new, immutable NegotiationVersion and reuses DealService's existing
    // evaluation pipeline — material-change detection, approval invalidation,
    // the engines, and the sequential approval chain all run exactly as they
    // do for a rep-driven edit. No second evaluation/decision path is created.
    // ------------------------------------------------------------------

    /** Finds or opens the single negotiation thread for a deal. */
    public Negotiation getOrCreateNegotiation(Deal deal) {
        return negotiationRepository.findByDealId(deal.getId())
                .orElseGet(() -> negotiationRepository.save(Negotiation.builder()
                        .deal(deal)
                        .customer(deal.getCustomer())
                        .build()));
    }

    @Transactional(readOnly = true)
    public Negotiation requireNegotiation(UUID dealId) {
        return negotiationRepository.findByDealId(dealId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No negotiation exists yet for deal " + dealId));
    }

    /**
     * Applies a customer counter-offer: reuses {@link DealService#applyDiscount}
     * for the authoritative recalculation and re-evaluation, then freezes the
     * resulting commercial state as a brand-new {@link NegotiationVersion}. The
     * previous active version is superseded, never overwritten.
     */
    public NegotiationVersion submitCounterOffer(UUID dealId, BigDecimal discountPercent, String actor) {
        Deal before = dealService.require(dealId);
        Negotiation negotiation = getOrCreateNegotiation(before);

        Deal updated = dealService.applyDiscount(dealId, discountPercent, actor);
        if (updated.getStatus() == DealStatus.DRAFT) {
            updated.setStatus(DealStatus.IN_NEGOTIATION);
        }

        return recordVersion(negotiation, updated, actor);
    }

    /**
     * Applies a customer counter-offer that also changes quantities/products
     * (reuses {@link DealService#replaceLines}), then versions the result.
     */
    public NegotiationVersion submitCounterOffer(UUID dealId,
                                                 List<DealService.LineRequest> proposedLines,
                                                 String actor) {
        Deal before = dealService.require(dealId);
        Negotiation negotiation = getOrCreateNegotiation(before);

        Deal updated = dealService.replaceLines(dealId, proposedLines, actor);
        if (updated.getStatus() == DealStatus.DRAFT) {
            updated.setStatus(DealStatus.IN_NEGOTIATION);
        }

        return recordVersion(negotiation, updated, actor);
    }

    private NegotiationVersion recordVersion(Negotiation negotiation, Deal deal, String actor) {
        negotiationVersionRepository.findByNegotiationIdAndStatus(negotiation.getId(), NegotiationVersionStatus.ACTIVE)
                .ifPresent(previous -> {
                    previous.setStatus(NegotiationVersionStatus.SUPERSEDED);
                    negotiationVersionRepository.save(previous);
                });

        int nextVersionNumber = negotiationVersionRepository
                .findTopByNegotiationIdOrderByVersionNumberDesc(negotiation.getId())
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        NegotiationVersionStatus status = deal.getStatus() == DealStatus.REJECTED
                ? NegotiationVersionStatus.REJECTED
                : NegotiationVersionStatus.ACTIVE;

        NegotiationVersion version = NegotiationVersion.builder()
                .negotiation(negotiation)
                .versionNumber(nextVersionNumber)
                .status(status)
                .discountPercent(deal.effectiveDiscountPercent())
                .subtotal(deal.getSubtotal())
                .totalAmount(deal.getTotalAmount())
                .marginPercent(deal.getMarginPercent())
                .createdBy(actor == null ? "system" : actor)
                .createdAt(java.time.Instant.now())
                .build();

        for (DealLine line : deal.getLines()) {
            version.addItem(NegotiationVersionItem.builder()
                    .productSku(line.getProduct().getSku())
                    .productName(line.getProduct().getName())
                    .quantity(line.getQuantity())
                    .unitPrice(line.getUnitPrice())
                    .discountPercent(line.getDiscountPercent())
                    .lineTotal(line.getLineTotal())
                    .build());
        }

        NegotiationVersion saved = negotiationVersionRepository.save(version);

        auditService.record(
                AuditService.NEGOTIATION, negotiation.getId(),
                AuditService.NEGOTIATION_VERSION_CREATED, actor,
                null, "v" + nextVersionNumber,
                "Counter-offer: discount=" + deal.effectiveDiscountPercent() + "%, total=" + deal.getTotalAmount());

        return saved;
    }

    /** Flips the negotiation's active version to ACCEPTED — called on customer confirmation. */
    public void markActiveVersionAccepted(UUID negotiationId) {
        negotiationVersionRepository.findByNegotiationIdAndStatus(negotiationId, NegotiationVersionStatus.ACTIVE)
                .ifPresent(active -> {
                    active.setStatus(NegotiationVersionStatus.ACCEPTED);
                    negotiationVersionRepository.save(active);
                });
    }

    /** Adds a comment to a negotiation thread, optionally tied to one deal line. */
    public NegotiationMessage addMessage(UUID negotiationId, String author, String authorRole,
                                         String content, DealLine dealLine) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content cannot be blank");
        }
        Negotiation negotiation = negotiationRepository.findById(negotiationId)
                .orElseThrow(() -> new IllegalArgumentException("No negotiation with id " + negotiationId));

        NegotiationMessage message = negotiationMessageRepository.save(NegotiationMessage.builder()
                .negotiation(negotiation)
                .dealLine(dealLine)
                .author(author == null ? "system" : author)
                .authorRole(authorRole)
                .content(content)
                .build());

        auditService.record(
                AuditService.NEGOTIATION, negotiationId,
                AuditService.NEGOTIATION_MESSAGE_ADDED, author,
                "New negotiation comment");

        return message;
    }

    @Transactional(readOnly = true)
    public List<NegotiationVersion> versionsFor(UUID negotiationId) {
        return negotiationVersionRepository.findByNegotiationIdOrderByVersionNumberDesc(negotiationId);
    }

    @Transactional(readOnly = true)
    public List<NegotiationMessage> messagesFor(UUID negotiationId) {
        return negotiationMessageRepository.findByNegotiationIdOrderByCreatedAtAsc(negotiationId);
    }

    /**
     * The deepest discount that keeps every line at or above the configured
     * margin floor — the rep's walk-away number.
     */
    @Transactional(readOnly = true)
    public BigDecimal floorDiscount(Deal deal) {
        BigDecimal floor = policyRepository
                .findByTypeAndActiveTrue(com.dice.domain.enums.PolicyType.MARGIN_FLOOR).stream()
                .map(com.dice.domain.Policy::getThresholdValue)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.valueOf(15));

        return deal.getLines().stream()
                .map(line -> pricingService.maxDiscountForMargin(line, floor))
                .min(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * @param maxAllowedDiscountPercent how far the rep can go before breaching the margin floor
     */
    public record Preview(
            BigDecimal proposedDiscountPercent,
            BigDecimal currentTotal,
            BigDecimal proposedTotal,
            BigDecimal resultingMarginPercent,
            com.dice.domain.enums.DecisionOutcome outcome,
            String rationale,
            List<RecommendationEngine.Recommendation> recommendations,
            BigDecimal maxAllowedDiscountPercent) {

        public boolean isAcceptable() {
            return outcome == com.dice.domain.enums.DecisionOutcome.AUTO_APPROVE;
        }
    }
}
