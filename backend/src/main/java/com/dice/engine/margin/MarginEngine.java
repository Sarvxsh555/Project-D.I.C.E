package com.dice.engine.margin;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Computes profitability. Pure arithmetic over a {@link Deal} — no repository
 * access, no side effects — which keeps it trivially unit-testable.
 *
 * <p>Margin is expressed as a percentage of revenue (not of cost):
 * {@code (revenue - cost) / revenue * 100}.
 */
@Component
public class MarginEngine {

    /** Enough precision for intermediate division; results round to 4 dp. */
    private static final int CALC_SCALE = 10;
    private static final int RESULT_SCALE = 4;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    public MarginResult compute(Deal deal) {
        List<LineMargin> lineMargins = deal.getLines().stream()
                .map(MarginEngine::computeLine)
                .toList();

        BigDecimal revenue = lineMargins.stream()
                .map(LineMargin::revenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cost = lineMargins.stream()
                .map(LineMargin::cost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new MarginResult(
                revenue.setScale(2, RoundingMode.HALF_UP),
                cost.setScale(2, RoundingMode.HALF_UP),
                revenue.subtract(cost).setScale(2, RoundingMode.HALF_UP),
                percentOf(revenue.subtract(cost), revenue),
                lineMargins);
    }

    private static LineMargin computeLine(DealLine line) {
        BigDecimal qty = BigDecimal.valueOf(line.getQuantity());
        BigDecimal revenue = line.netUnitPrice().multiply(qty);
        BigDecimal cost = line.getProduct().getStandardCost().multiply(qty);

        return new LineMargin(
                line.getId(),
                line.getProduct().getSku(),
                revenue.setScale(2, RoundingMode.HALF_UP),
                cost.setScale(2, RoundingMode.HALF_UP),
                percentOf(revenue.subtract(cost), revenue));
    }

    /**
     * {@code numerator / denominator} as a percentage.
     * A zero denominator yields zero rather than blowing up — a fully
     * discounted line is a legitimate state that policy, not maths, rejects.
     */
    private static BigDecimal percentOf(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.signum() == 0) {
            return BigDecimal.ZERO.setScale(RESULT_SCALE);
        }
        return numerator
                .divide(denominator, CALC_SCALE, RoundingMode.HALF_UP)
                .multiply(HUNDRED)
                .setScale(RESULT_SCALE, RoundingMode.HALF_UP);
    }

    /** Deal-level profitability, plus the per-line breakdown behind it. */
    public record MarginResult(
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal marginAmount,
            BigDecimal marginPercent,
            List<LineMargin> lines) {

        /** The line dragging the deal down; empty when there are no lines. */
        public java.util.Optional<LineMargin> weakestLine() {
            return lines.stream().min(java.util.Comparator.comparing(LineMargin::marginPercent));
        }
    }

    public record LineMargin(
            UUID lineId,
            String sku,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal marginPercent) {
    }
}
