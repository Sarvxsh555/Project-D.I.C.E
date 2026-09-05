package com.dice.engine.health;

import com.dice.domain.Deal;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import com.dice.engine.risk.RiskEngine;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Rolls margin, risk and policy compliance into a single 0–100 score (higher is
 * healthier) for the pipeline view.
 *
 * <p>Starts at 100 and deducts. Every deduction is named so the deal detail
 * page can show the breakdown rather than an unexplained number.
 */
@Component
public class DealHealthEngine {

    /** Below this a deal is flagged "at risk" in the dashboard. */
    public static final int AT_RISK_THRESHOLD = 60;

    private static final int MAX_SCORE = 100;
    private static final BigDecimal HEALTHY_MARGIN_PERCENT = BigDecimal.valueOf(25);

    // Deduction weights.
    private static final int RISK_WEIGHT = 40;          // scaled by risk score
    private static final int PER_BLOCKING_VIOLATION = 25;
    private static final int PER_APPROVAL_VIOLATION = 8;
    private static final int MAX_MARGIN_DEDUCTION = 30;

    public HealthScore score(Deal deal,
                             MarginEngine.MarginResult margin,
                             RiskEngine.RiskAssessment risk,
                             PolicyEngine.PolicyReport policies) {

        List<Deduction> deductions = new ArrayList<>();

        int riskDeduction = risk.score() * RISK_WEIGHT / 100;
        if (riskDeduction > 0) {
            deductions.add(new Deduction("RISK", riskDeduction,
                    "Risk assessed as %s (%d/100)".formatted(risk.level(), risk.score())));
        }

        int marginDeduction = marginDeduction(margin.marginPercent());
        if (marginDeduction > 0) {
            deductions.add(new Deduction("MARGIN", marginDeduction,
                    "Margin of %s%% is under the %s%% healthy line"
                            .formatted(margin.marginPercent(), HEALTHY_MARGIN_PERCENT)));
        }

        long blocking = policies.violations().stream()
                .filter(v -> v.severity() == com.dice.domain.enums.PolicySeverity.BLOCKING)
                .count();
        if (blocking > 0) {
            deductions.add(new Deduction("POLICY_BLOCKING",
                    (int) blocking * PER_BLOCKING_VIOLATION,
                    "%d blocking policy breach(es)".formatted(blocking)));
        }

        int approvalCount = policies.requiringApproval().size();
        if (approvalCount > 0) {
            deductions.add(new Deduction("POLICY_APPROVAL",
                    approvalCount * PER_APPROVAL_VIOLATION,
                    "%d breach(es) awaiting sign-off".formatted(approvalCount)));
        }

        int total = deductions.stream().mapToInt(Deduction::points).sum();
        int score = Math.max(0, Math.min(MAX_SCORE - total, MAX_SCORE));

        return new HealthScore(score, bandFor(score), List.copyOf(deductions));
    }

    /** Linear penalty from the healthy line down to zero margin. */
    private int marginDeduction(BigDecimal marginPercent) {
        if (marginPercent == null || marginPercent.compareTo(HEALTHY_MARGIN_PERCENT) >= 0) {
            return 0;
        }
        BigDecimal shortfall = HEALTHY_MARGIN_PERCENT.subtract(marginPercent)
                .max(BigDecimal.ZERO)
                .min(HEALTHY_MARGIN_PERCENT);
        return shortfall
                .divide(HEALTHY_MARGIN_PERCENT, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(MAX_MARGIN_DEDUCTION))
                .intValue();
    }

    private Band bandFor(int score) {
        if (score >= 80) {
            return Band.HEALTHY;
        }
        if (score >= AT_RISK_THRESHOLD) {
            return Band.WATCH;
        }
        if (score >= 30) {
            return Band.AT_RISK;
        }
        return Band.CRITICAL;
    }

    public enum Band { HEALTHY, WATCH, AT_RISK, CRITICAL }

    public record HealthScore(int score, Band band, List<Deduction> deductions) {

        public boolean isAtRisk() {
            return score < AT_RISK_THRESHOLD;
        }

        /** Biggest problem first — what to show when there is room for one line. */
        public java.util.Optional<Deduction> primaryDrag() {
            return deductions.stream().max(java.util.Comparator.comparingInt(Deduction::points));
        }
    }

    public record Deduction(String code, int points, String explanation) {
    }
}
