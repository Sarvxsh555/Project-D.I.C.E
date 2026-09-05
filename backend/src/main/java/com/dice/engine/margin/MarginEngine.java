package com.dice.engine.margin;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Computes profitability from authoritative backend data only — a caller's
 * own totals (a portal quote, a rep's typed-in number) are never trusted;
 * everything here is re-derived from the deal's lines and the product's cost.
 * Pure arithmetic over a {@link Deal} — no repository access, no side effects
 * — which keeps it trivially unit-testable.
 *
 * <p>Margin is expressed as a percentage of discounted revenue (not of cost):
 * {@code (discountedRevenue - cost) / discountedRevenue * 100}.
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

        BigDecimal grossRevenue = lineMargins.stream()
                .map(LineMargin::grossRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal revenue = lineMargins.stream()
                .map(LineMargin::discountedRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cost = lineMargins.stream()
                .map(LineMargin::cost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new MarginResult(
                grossRevenue.setScale(2, RoundingMode.HALF_UP),
                cost.setScale(2, RoundingMode.HALF_UP),
                revenue.setScale(2, RoundingMode.HALF_UP),
                revenue.subtract(cost).setScale(2, RoundingMode.HALF_UP),
                percentOf(revenue.subtract(cost), revenue),
                lineMargins);
    }

    /**
     * A line with a non-positive quantity contributes nothing rather than
     * producing a negative or divide-by-zero result — the DB forbids it
     * ({@code deal_lines_quantity_positive}), but the engine stays defensive
     * for callers that build a {@link DealLine} directly (e.g. tests).
     */
    private static LineMargin computeLine(DealLine line) {
        if (line.getQuantity() == null || line.getQuantity() <= 0) {
            BigDecimal zero = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            return new LineMargin(line.getId(), line.getProduct().getSku(), zero, zero, zero,
                    BigDecimal.ZERO.setScale(RESULT_SCALE));
        }

        BigDecimal qty = BigDecimal.valueOf(line.getQuantity());
        BigDecimal grossRevenue = line.getUnitPrice().multiply(qty);
        BigDecimal revenue = line.netUnitPrice().multiply(qty);
        BigDecimal cost = line.getProduct().getStandardCost().multiply(qty);

        return new LineMargin(
                line.getId(),
                line.getProduct().getSku(),
                grossRevenue.setScale(2, RoundingMode.HALF_UP),
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

    /**
     * Deal-level profitability, plus the per-line breakdown behind it.
     *
     * @param revenue           gross, pre-discount revenue (list price x quantity)
     * @param cost              standard cost x quantity
     * @param discountedRevenue revenue actually billed, net of line discounts —
     *                          what margin is measured against
     */
    public record MarginResult(
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal discountedRevenue,
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
            BigDecimal grossRevenue,
            BigDecimal discountedRevenue,
            BigDecimal cost,
            BigDecimal marginPercent) {
    }
}
