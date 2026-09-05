package com.dice.engine.recommendation;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Product;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Proposes concrete ways to rescue a deal that policy would otherwise block or
 * escalate — the difference between "computer says no" and a counter-offer the
 * rep can actually put in front of a customer.
 *
 * <p>Each {@link Recommendation} is a self-contained "if you do X, Y happens",
 * quantified where possible so the UI can rank them.
 */
@Component
public class RecommendationEngine {

    /** Don't bother suggesting a change worth less than this much margin. */
    private static final BigDecimal MIN_MATERIAL_IMPACT = BigDecimal.valueOf(0.5);

    /** Volume uplift we suggest when trading quantity for discount. */
    private static final BigDecimal VOLUME_UPLIFT = BigDecimal.valueOf(1.25);

    public List<Recommendation> recommend(Deal deal,
                                          MarginEngine.MarginResult margin,
                                          PolicyEngine.PolicyReport report,
                                          List<Product> catalogue) {
        List<Recommendation> out = new ArrayList<>();

        for (PolicyEngine.Violation violation : report.violations()) {
            switch (violation.type()) {
                case DISCOUNT_LIMIT -> reduceDiscount(deal, violation).ifPresent(out::add);
                case MARGIN_FLOOR -> {
                    swapWeakestLine(deal, margin, catalogue).ifPresent(out::add);
                    tradeVolumeForPrice(deal, violation).ifPresent(out::add);
                }
                case CREDIT_LIMIT -> out.add(shortenPaymentTerms(violation));
                case APPROVAL_THRESHOLD -> out.add(splitDeal(deal, violation));
                case QUANTITY_LIMIT, PAYMENT_TERMS -> {
                    // Nothing automatic to suggest; the approval path is the answer.
                }
            }
        }

        return out.stream()
                .sorted(Comparator.comparing(Recommendation::confidence).reversed())
                .toList();
    }

    /** Pull the discount back to exactly the cap. */
    private java.util.Optional<Recommendation> reduceDiscount(Deal deal,
                                                              PolicyEngine.Violation violation) {
        BigDecimal excess = violation.actualValue().subtract(violation.thresholdValue());
        if (excess.compareTo(MIN_MATERIAL_IMPACT) < 0) {
            return java.util.Optional.empty();
        }
        BigDecimal recovered = deal.getSubtotal()
                .multiply(excess)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        return java.util.Optional.of(new Recommendation(
                "REDUCE_DISCOUNT",
                "Cut the discount to %s%%".formatted(violation.thresholdValue().setScale(2, RoundingMode.HALF_UP)),
                "Brings the deal inside %s and removes the approval step entirely."
                        .formatted(violation.policyCode()),
                recovered,
                Confidence.HIGH));
    }

    /**
     * Find a cheaper-to-serve product in the same category to replace the
     * worst-margin line.
     */
    private java.util.Optional<Recommendation> swapWeakestLine(Deal deal,
                                                               MarginEngine.MarginResult margin,
                                                               List<Product> catalogue) {
        var weakest = margin.weakestLine();
        if (weakest.isEmpty()) {
            return java.util.Optional.empty();
        }

        DealLine line = deal.getLines().stream()
                .filter(l -> l.getId() != null && l.getId().equals(weakest.get().lineId()))
                .findFirst()
                .orElse(null);
        if (line == null) {
            return java.util.Optional.empty();
        }

        Product current = line.getProduct();
        java.util.Optional<Product> alternative = catalogue.stream()
                .filter(Product::isActive)
                .filter(p -> !p.getId().equals(current.getId()))
                .filter(p -> java.util.Objects.equals(p.getCategory(), current.getCategory()))
                // Better margin at list price is the proxy for "cheaper to serve".
                .max(Comparator.comparing(RecommendationEngine::listMarginPercent));

        if (alternative.isEmpty()) {
            return java.util.Optional.empty();
        }

        Product swap = alternative.get();
        BigDecimal gain = swap.getListPrice().subtract(swap.getStandardCost())
                .subtract(current.getListPrice().subtract(current.getStandardCost()))
                .multiply(BigDecimal.valueOf(line.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);

        if (gain.signum() <= 0) {
            return java.util.Optional.empty();
        }

        return java.util.Optional.of(new Recommendation(
                "SWAP_PRODUCT",
                "Swap %s for %s".formatted(current.getSku(), swap.getSku()),
                "Same category, better unit economics — lifts deal margin without touching the price the customer sees.",
                gain,
                Confidence.MEDIUM));
    }

    /** Keep the discount, ask for more units to earn it. */
    private java.util.Optional<Recommendation> tradeVolumeForPrice(Deal deal,
                                                                   PolicyEngine.Violation violation) {
        if (deal.getLines().isEmpty()) {
            return java.util.Optional.empty();
        }
        BigDecimal uplift = deal.getTotalAmount()
                .multiply(VOLUME_UPLIFT.subtract(BigDecimal.ONE))
                .setScale(2, RoundingMode.HALF_UP);

        return java.util.Optional.of(new Recommendation(
                "TRADE_VOLUME",
                "Hold the discount, raise volume by 25%",
                "Absorbs the %s shortfall through scale rather than price concession."
                        .formatted(violation.policyCode()),
                uplift,
                Confidence.MEDIUM));
    }

    private Recommendation shortenPaymentTerms(PolicyEngine.Violation violation) {
        return new Recommendation(
                "SHORTEN_TERMS",
                "Move to prepayment or 15-day terms",
                "Reduces credit exposure so %s no longer applies.".formatted(violation.policyCode()),
                BigDecimal.ZERO,
                Confidence.HIGH);
    }

    private Recommendation splitDeal(Deal deal, PolicyEngine.Violation violation) {
        return new Recommendation(
                "SPLIT_DEAL",
                "Split into phased orders",
                "Each tranche lands under the %s threshold and can be auto-approved."
                        .formatted(violation.thresholdValue().setScale(2, RoundingMode.HALF_UP)),
                BigDecimal.ZERO,
                Confidence.LOW);
    }

    private static BigDecimal listMarginPercent(Product product) {
        if (product.getListPrice() == null || product.getListPrice().signum() == 0) {
            return BigDecimal.ZERO;
        }
        return product.getListPrice().subtract(product.getStandardCost())
                .divide(product.getListPrice(), 6, RoundingMode.HALF_UP);
    }

    /** How much we trust the suggestion; drives ordering in the UI. */
    public enum Confidence { LOW, MEDIUM, HIGH }

    /**
     * @param estimatedValue margin or revenue the action recovers, in deal
     *                       currency. Zero means "not quantifiable", not "worthless".
     */
    public record Recommendation(
            String code,
            String title,
            String rationale,
            BigDecimal estimatedValue,
            Confidence confidence) {
    }
}
