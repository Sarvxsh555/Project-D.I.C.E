package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.enums.DealStatus;
import com.dice.engine.decision.DecisionResolver;
import com.dice.engine.recommendation.RecommendationEngine;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
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
