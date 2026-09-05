package com.dice.engine.risk;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.enums.RiskLevel;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Scores counterparty and deal risk on a 0–100 scale (higher is riskier) by
 * summing weighted factors, then buckets the total into a {@link RiskLevel}.
 *
 * <p>The weights are deliberately simple and additive so the UI can show
 * "why" — every point of the score traces back to a named {@link Factor}.
 */
@Component
public class RiskEngine {

    // Factor ceilings. These sum to 100.
    private static final int MAX_CREDIT_EXPOSURE = 35;
    private static final int MAX_PAYMENT_HISTORY = 25;
    private static final int MAX_DEAL_SIZE = 20;
    private static final int MAX_DISCOUNT_PRESSURE = 20;

    // Score thresholds, inclusive lower bounds.
    private static final int THRESHOLD_CRITICAL = 75;
    private static final int THRESHOLD_HIGH = 50;
    private static final int THRESHOLD_MODERATE = 25;

    /** A deal worth this much of a customer's credit limit is "large". */
    private static final BigDecimal LARGE_DEAL_CREDIT_RATIO = BigDecimal.valueOf(0.5);

    public RiskAssessment assess(Deal deal, Customer customer) {
        List<Factor> factors = new ArrayList<>();

        factors.add(creditExposure(deal, customer));
        factors.add(paymentHistory(customer));
        factors.add(dealSize(deal, customer));
        factors.add(discountPressure(deal));

        int score = factors.stream().mapToInt(Factor::points).sum();
        score = Math.clamp(score, 0, 100);

        return new RiskAssessment(score, levelFor(score), List.copyOf(factors));
    }

    /** How much of the deal the customer cannot currently cover on credit. */
    private Factor creditExposure(Deal deal, Customer customer) {
        BigDecimal available = customer.availableCredit();
        BigDecimal total = deal.getTotalAmount();

        if (total == null || total.signum() == 0) {
            return new Factor("CREDIT_EXPOSURE", 0, "No deal value to expose credit to");
        }
        if (available.compareTo(total) >= 0) {
            return new Factor("CREDIT_EXPOSURE", 0,
                    "Available credit (%s) covers the deal".formatted(available));
        }

        BigDecimal shortfall = total.subtract(available);
        BigDecimal ratio = shortfall.divide(total, 4, RoundingMode.HALF_UP);
        int points = ratio.multiply(BigDecimal.valueOf(MAX_CREDIT_EXPOSURE)).intValue();
        return new Factor("CREDIT_EXPOSURE", points,
                "Deal exceeds available credit by %s".formatted(shortfall));
    }

    /** Late payers are the strongest predictor we have. */
    private Factor paymentHistory(Customer customer) {
        BigDecimal onTime = customer.getOnTimePaymentRate();
        if (onTime == null) {
            // Unknown history is treated as middling, not clean.
            return new Factor("PAYMENT_HISTORY", MAX_PAYMENT_HISTORY / 2,
                    "No payment history on file");
        }
        BigDecimal lateRate = BigDecimal.valueOf(100).subtract(onTime)
                .max(BigDecimal.ZERO)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        int points = lateRate.multiply(BigDecimal.valueOf(MAX_PAYMENT_HISTORY)).intValue();
        return new Factor("PAYMENT_HISTORY", points,
                "On-time payment rate %s%%".formatted(onTime));
    }

    /** Concentration risk: one oversized deal against a small account. */
    private Factor dealSize(Deal deal, Customer customer) {
        BigDecimal limit = customer.getCreditLimit();
        BigDecimal total = deal.getTotalAmount();
        if (limit == null || limit.signum() == 0 || total == null) {
            return new Factor("DEAL_SIZE", 0, "No credit limit to compare against");
        }
        BigDecimal ratio = total.divide(limit, 4, RoundingMode.HALF_UP);
        if (ratio.compareTo(LARGE_DEAL_CREDIT_RATIO) < 0) {
            return new Factor("DEAL_SIZE", 0, "Deal is small relative to the account");
        }
        int points = Math.min(MAX_DEAL_SIZE,
                ratio.multiply(BigDecimal.valueOf(MAX_DEAL_SIZE)).intValue());
        return new Factor("DEAL_SIZE", points,
                "Deal is %sx the customer's credit limit".formatted(ratio));
    }

    /** Deep discounting correlates with desperation on both sides. */
    private Factor discountPressure(Deal deal) {
        BigDecimal discount = deal.effectiveDiscountPercent();
        if (discount.signum() <= 0) {
            return new Factor("DISCOUNT_PRESSURE", 0, "No discount applied");
        }
        // 40% off or more saturates the factor.
        BigDecimal ratio = discount.divide(BigDecimal.valueOf(40), 4, RoundingMode.HALF_UP)
                .min(BigDecimal.ONE);
        int points = ratio.multiply(BigDecimal.valueOf(MAX_DISCOUNT_PRESSURE)).intValue();
        return new Factor("DISCOUNT_PRESSURE", points,
                "Effective discount of %s%%".formatted(discount.setScale(2, RoundingMode.HALF_UP)));
    }

    private RiskLevel levelFor(int score) {
        if (score >= THRESHOLD_CRITICAL) {
            return RiskLevel.CRITICAL;
        }
        if (score >= THRESHOLD_HIGH) {
            return RiskLevel.HIGH;
        }
        if (score >= THRESHOLD_MODERATE) {
            return RiskLevel.MODERATE;
        }
        return RiskLevel.LOW;
    }

    public record RiskAssessment(int score, RiskLevel level, List<Factor> factors) {

        /** Factors that actually contributed, worst first — what the UI shows. */
        public List<Factor> contributingFactors() {
            return factors.stream()
                    .filter(f -> f.points() > 0)
                    .sorted(java.util.Comparator.comparingInt(Factor::points).reversed())
                    .toList();
        }
    }

    /** One named contribution to the risk score. */
    public record Factor(String code, int points, String explanation) {
    }
}
