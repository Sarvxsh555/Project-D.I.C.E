package com.dice.engine.health;

import com.dice.config.DiceProperties;
import com.dice.domain.Deal;
import com.dice.domain.enums.HealthStatus;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import com.dice.engine.risk.RiskEngine;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Rolls margin, risk and policy compliance into a single 0–100 score (higher is
 * healthier) for the pipeline view. Commit 22 extends the same score with
 * inactivity, approval delay, discount anomaly, delivery slippage and
 * negotiation-cycle signals, each an independent, configurable deduction —
 * no machine learning, every number is explained.
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

    private static final DiceProperties.Health DEFAULT_HEALTH_CONFIG =
            new DiceProperties.Health(14, 15, 48, 15, 20, 7, 15, 3, 10, 70, 40);

    private final DiceProperties.Health config;

    /** Spring wiring — falls back to the documented defaults if not configured. */
    public DealHealthEngine(DiceProperties properties) {
        this.config = properties != null && properties.health() != null
                ? properties.health() : DEFAULT_HEALTH_CONFIG;
    }

    /** For direct construction outside Spring (existing tests). */
    public DealHealthEngine() {
        this(null);
    }

    public HealthScore score(Deal deal,
                             MarginEngine.MarginResult margin,
                             RiskEngine.RiskAssessment risk,
                             PolicyEngine.PolicyReport policies) {
        return score(deal, margin, risk, policies, HealthSignals.NONE);
    }

    /**
     * Commit 22: the same margin/risk/policy score, plus deductions from
     * inactivity, approval delay, an already-detected discount anomaly,
     * delivery slippage and negotiation-cycle count. Pass
     * {@link HealthSignals#NONE} to get exactly the original behaviour.
     */
    public HealthScore score(Deal deal,
                             MarginEngine.MarginResult margin,
                             RiskEngine.RiskAssessment risk,
                             PolicyEngine.PolicyReport policies,
                             HealthSignals signals) {

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

        deductions.addAll(signalDeductions(signals));

        int total = deductions.stream().mapToInt(Deduction::points).sum();
        int score = Math.clamp(MAX_SCORE - total, 0, MAX_SCORE);

        return new HealthScore(score, bandFor(score), statusFor(score), List.copyOf(deductions));
    }

    /** The commit-22 signal inputs, each an independent configurable-threshold deduction. */
    private List<Deduction> signalDeductions(HealthSignals signals) {
        List<Deduction> extra = new ArrayList<>();

        if (signals.inactivityDays() > config.inactivityDays()) {
            extra.add(new Deduction("INACTIVITY", config.inactivityWeight(),
                    "No activity for %d days (threshold %d)"
                            .formatted(signals.inactivityDays(), config.inactivityDays())));
        }

        if (signals.approvalDelayHours() > config.approvalDelayHours()) {
            extra.add(new Deduction("APPROVAL_DELAY", config.approvalDelayWeight(),
                    "Approval has been pending %d hours (threshold %d)"
                            .formatted(signals.approvalDelayHours(), config.approvalDelayHours())));
        }

        if (signals.discountAnomalyDetected()) {
            extra.add(new Deduction("DISCOUNT_ANOMALY", config.discountAnomalyWeight(),
                    "Discount anomaly detected: " + signals.discountAnomalyReason()));
        }

        if (signals.deliverySlippageDays() > config.deliverySlippageDays()) {
            extra.add(new Deduction("DELIVERY_SLIPPAGE", config.deliverySlippageWeight(),
                    "Delivery is %d days behind the requested date (threshold %d)"
                            .formatted(signals.deliverySlippageDays(), config.deliverySlippageDays())));
        }

        if (signals.negotiationCycles() > config.negotiationCycleThreshold()) {
            extra.add(new Deduction("NEGOTIATION_CYCLES", config.negotiationCycleWeight(),
                    "%d negotiation cycles so far (threshold %d)"
                            .formatted(signals.negotiationCycles(), config.negotiationCycleThreshold())));
        }

        return extra;
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

    /** The commit-22 required three-value status, using the configurable thresholds. */
    private HealthStatus statusFor(int score) {
        if (score >= config.healthyThreshold()) {
            return HealthStatus.HEALTHY;
        }
        if (score >= config.atRiskThreshold()) {
            return HealthStatus.AT_RISK;
        }
        return HealthStatus.CRITICAL;
    }

    public enum Band { HEALTHY, WATCH, AT_RISK, CRITICAL }

    /**
     * Deal-health inputs beyond margin/risk/policy. Every field defaults to
     * "no signal" so {@link #NONE} reproduces the pre-commit-22 score exactly.
     */
    public record HealthSignals(
            int inactivityDays,
            int approvalDelayHours,
            boolean discountAnomalyDetected,
            String discountAnomalyReason,
            int deliverySlippageDays,
            int negotiationCycles) {

        public static final HealthSignals NONE = new HealthSignals(0, 0, false, null, 0, 0);
    }

    public record HealthScore(int score, Band band, HealthStatus status, List<Deduction> deductions) {

        public boolean isAtRisk() {
            return score < AT_RISK_THRESHOLD;
        }

        /** Biggest problem first — what to show when there is room for one line. */
        public java.util.Optional<Deduction> primaryDrag() {
            return deductions.stream().max(java.util.Comparator.comparingInt(Deduction::points));
        }

        /** Reasons behind the current status, most-severe first. */
        public List<String> reasons() {
            return deductions.stream()
                    .sorted(java.util.Comparator.comparingInt(Deduction::points).reversed())
                    .map(Deduction::explanation)
                    .toList();
        }
    }

    public record Deduction(String code, int points, String explanation) {
    }
}
