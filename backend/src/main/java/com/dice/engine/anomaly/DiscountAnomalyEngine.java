package com.dice.engine.anomaly;

import com.dice.domain.enums.AnomalySeverity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/**
 * Rule-based (explicitly not ML) discount-anomaly check: how far the current
 * representative discount sits from the historical average, expressed as a
 * ratio against a configured threshold.
 */
public final class DiscountAnomalyEngine {

    private DiscountAnomalyEngine() {
    }

    /**
     * @param baseline        historical average discount percent; empty/zero baseline never anomalous
     * @param currentValue    current discount percent
     * @param ratioThreshold  e.g. 1.5 means "50% above baseline flags an anomaly"
     */
    public static Optional<Result> evaluate(BigDecimal baseline, BigDecimal currentValue, double ratioThreshold) {
        if (baseline == null || baseline.signum() <= 0 || currentValue == null) {
            return Optional.empty();
        }

        BigDecimal ratio = currentValue.divide(baseline, 6, RoundingMode.HALF_UP);
        if (ratio.doubleValue() <= ratioThreshold) {
            return Optional.empty();
        }

        AnomalySeverity severity = severityFor(ratio.doubleValue(), ratioThreshold);
        String reason = "Discount %s%% is %.2fx the historical average of %s%% (threshold %.2fx)"
                .formatted(currentValue.toPlainString(), ratio.doubleValue(),
                        baseline.toPlainString(), ratioThreshold);

        return Optional.of(new Result(baseline, currentValue, ratio, severity, reason));
    }

    private static AnomalySeverity severityFor(double ratio, double threshold) {
        double overage = ratio - threshold;
        if (overage >= threshold) {
            return AnomalySeverity.HIGH;
        }
        if (overage >= threshold / 2) {
            return AnomalySeverity.MEDIUM;
        }
        return AnomalySeverity.LOW;
    }

    public record Result(
            BigDecimal baseline,
            BigDecimal currentValue,
            BigDecimal ratio,
            AnomalySeverity severity,
            String reason) {
    }
}
