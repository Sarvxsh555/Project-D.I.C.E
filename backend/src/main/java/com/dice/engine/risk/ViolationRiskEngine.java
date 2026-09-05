package com.dice.engine.risk;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.enums.RiskLevel;
import com.dice.engine.policy.PolicyEngine;
import com.dice.security.Role;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Blends per-line discount-policy violations ({@link PolicyEngine#evaluateLineDiscounts})
 * into a single value-weighted risk score. Distinct from {@link RiskEngine}, which
 * scores counterparty/credit risk — this one scores the quotation's own
 * pattern of policy breaches.
 *
 * <p>A violation on a small line matters less than the same violation on a
 * large one, so each line's overage is weighted by that line's own value
 * before being normalised against the quote total:
 *
 * <pre>
 * weighted_violation = Σ(max(0, actual% - allowed%) / 100 × lineValue) / totalQuoteValue
 * risk_score = weighted_violation × 100
 * </pre>
 *
 * <p>The discount ceilings themselves are never hardcoded here — they arrive
 * already resolved (from configured {@link com.dice.domain.Policy} rows) in
 * each {@link PolicyEngine.LineDiscountEvaluation}. This engine only weighs them.
 */
@Component
public class ViolationRiskEngine {

    // Score thresholds, inclusive lower bounds. A risk-banding convention, not
    // a commercial threshold — those live in Policy rows.
    private static final int THRESHOLD_CRITICAL = 75;
    private static final int THRESHOLD_HIGH = 50;
    private static final int THRESHOLD_MODERATE = 25;

    private static final Map<RiskLevel, Role> APPROVAL_BY_LEVEL = Map.of(
            RiskLevel.LOW, Role.SALES_REP,
            RiskLevel.MODERATE, Role.SALES_MANAGER,
            RiskLevel.HIGH, Role.FINANCE,
            RiskLevel.CRITICAL, Role.ADMIN);

    public RiskResult assess(Deal deal, List<PolicyEngine.LineDiscountEvaluation> lineEvaluations) {
        Map<UUID, DealLine> linesById = deal.getLines().stream()
                .collect(Collectors.toMap(DealLine::getId, line -> line));

        BigDecimal totalQuoteValue = deal.getLines().stream()
                .map(this::lineValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LineViolation> lineViolations = new ArrayList<>();
        BigDecimal weightedSum = BigDecimal.ZERO;

        for (PolicyEngine.LineDiscountEvaluation eval : lineEvaluations) {
            if (eval.compliant()) {
                continue;
            }
            DealLine line = linesById.get(eval.lineId());
            if (line == null) {
                continue;
            }
            BigDecimal lineValue = lineValue(line);
            BigDecimal overageFraction = eval.overage().divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP);
            BigDecimal contribution = overageFraction.multiply(lineValue);
            weightedSum = weightedSum.add(contribution);

            lineViolations.add(new LineViolation(eval.lineId(), line.getProduct().getSku(),
                    eval.allowedDiscount(), eval.actualDiscount(), eval.overage(), lineValue, eval.reason()));
        }

        int score = normalize(weightedSum, totalQuoteValue);
        RiskLevel level = levelFor(score);
        List<String> reasons = lineViolations.stream()
                .map(LineViolation::reason)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        return new RiskResult(score, level, List.copyOf(lineViolations), reasons, APPROVAL_BY_LEVEL.get(level));
    }

    /** Net revenue for the line — what is actually at stake, after its own discount. */
    private BigDecimal lineValue(DealLine line) {
        if (line.getQuantity() == null || line.getQuantity() <= 0) {
            return BigDecimal.ZERO;
        }
        return line.netUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity()));
    }

    /** A quote with no value at risk (empty, or fully zeroed lines) scores zero rather than dividing by it. */
    private int normalize(BigDecimal weightedSum, BigDecimal totalQuoteValue) {
        if (totalQuoteValue.signum() == 0) {
            return 0;
        }
        BigDecimal weightedViolation = weightedSum.divide(totalQuoteValue, 8, RoundingMode.HALF_UP);
        int score = weightedViolation.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValue();
        return Math.max(0, Math.min(score, 100));
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

    /**
     * The blended outcome: a normalized score, its severity band, every
     * contributing line (preserved, not collapsed), plain-English reasons, and
     * the role whose sign-off the pattern demands.
     */
    public record RiskResult(
            int score,
            RiskLevel level,
            List<LineViolation> violations,
            List<String> reasons,
            Role requiredApprovalLevel) {
    }

    /** One line's contribution to the blended score, with enough context to explain it. */
    public record LineViolation(
            UUID lineId,
            String sku,
            BigDecimal allowedDiscount,
            BigDecimal actualDiscount,
            BigDecimal overage,
            BigDecimal lineValue,
            String reason) {
    }
}
