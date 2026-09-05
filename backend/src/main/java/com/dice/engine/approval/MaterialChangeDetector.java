package com.dice.engine.approval;

import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.Deal;
import com.dice.domain.enums.RiskLevel;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Compares a deal's live state against its last granted {@link ApprovalSnapshot}
 * and decides whether the approval still covers it.
 *
 * <p>Pure comparison, no persistence, no JSON — {@code DealService} owns
 * fetching the active snapshot, deserialising its frozen lines, and acting on
 * the result (superseding the snapshot, overriding the decision outcome).
 * Kept in the {@code engine} package alongside the other stateless evaluators
 * for the same reason they are: trivially unit-testable in isolation.
 *
 * <p><strong>What counts as material</strong> is a judgment call, made
 * explicit here rather than buried in comparisons: any change to the exact
 * set of lines (product, quantity, discount — a re-added identical line is not
 * a change, order doesn't matter), any change to the customer's payment
 * terms, and any change to the risk <em>bucket</em> (not the raw score — see
 * {@link #RISK_LEVEL_MATTERS_NOT_SCORE}). Small monetary/percentage drift
 * below {@link #AMOUNT_TOLERANCE}/{@link #PERCENT_TOLERANCE} is treated as
 * floating-point noise, not a real change — these are deliberately tight
 * tolerances (cents, hundredths of a percent), not a "how much is too much"
 * business threshold; there is no such threshold here on purpose. An approval
 * is scoped to an exact state — the moment any protected field moves for a
 * real reason, however small, it needs a human to look again.
 */
@Component
public class MaterialChangeDetector {

    private static final BigDecimal AMOUNT_TOLERANCE = new BigDecimal("0.01");
    private static final BigDecimal PERCENT_TOLERANCE = new BigDecimal("0.01");

    /**
     * Raw risk score drifts on every evaluation for reasons unrelated to any
     * decision a human made (e.g. a denominator shifting) — comparing it
     * directly would fire constantly. The bucket is the meaningful signal the
     * rest of the system already keys decisions on.
     */
    private static final boolean RISK_LEVEL_MATTERS_NOT_SCORE = true;

    /**
     * @param snapshotLines  the snapshot's own frozen lines, already deserialised
     * @param currentLines   the live deal's current lines
     */
    public Result detect(ApprovalSnapshot snapshot,
                         Deal deal,
                         RiskLevel currentRiskLevel,
                         List<LineSnapshot> snapshotLines,
                         List<LineSnapshot> currentLines,
                         Integer currentCustomerPaymentTermsDays) {

        List<String> changes = new ArrayList<>();

        compareAmount(changes, "totalAmount", snapshot.getTotalAmount(), deal.getTotalAmount());
        comparePercent(changes, "marginPercent", snapshot.getMarginPercent(), deal.getMarginPercent());

        if (!RISK_LEVEL_MATTERS_NOT_SCORE || snapshot.getRiskLevel() != currentRiskLevel) {
            changes.add("riskLevel: %s -> %s".formatted(snapshot.getRiskLevel(), currentRiskLevel));
        }

        if (!Objects.equals(snapshot.getCustomerPaymentTermsDays(), currentCustomerPaymentTermsDays)) {
            changes.add("customerPaymentTermsDays: %s -> %s"
                    .formatted(snapshot.getCustomerPaymentTermsDays(), currentCustomerPaymentTermsDays));
        }

        compareLines(changes, snapshotLines, currentLines);

        return new Result(!changes.isEmpty(), List.copyOf(changes));
    }

    private void compareAmount(List<String> changes, String field, BigDecimal before, BigDecimal after) {
        if (before.subtract(after).abs().compareTo(AMOUNT_TOLERANCE) > 0) {
            changes.add("%s: %s -> %s".formatted(field, before, after));
        }
    }

    private void comparePercent(List<String> changes, String field, BigDecimal before, BigDecimal after) {
        if (before.subtract(after).abs().compareTo(PERCENT_TOLERANCE) > 0) {
            changes.add("%s: %s%% -> %s%%".formatted(field, before, after));
        }
    }

    /**
     * Order-independent set comparison keyed by product — reordering lines in
     * the UI is not a material change, but adding, removing, or editing one is.
     * Sorted for a deterministic message order, not for correctness.
     */
    private void compareLines(List<String> changes, List<LineSnapshot> before, List<LineSnapshot> current) {
        var beforeByProduct = before.stream()
                .collect(Collectors.toMap(LineSnapshot::productId, l -> l));
        var afterByProduct = current.stream()
                .collect(Collectors.toMap(LineSnapshot::productId, l -> l));

        beforeByProduct.entrySet().stream()
                .sorted(Comparator.comparing(e -> e.getKey().toString()))
                .forEach(entry -> {
                    LineSnapshot after = afterByProduct.get(entry.getKey());
                    if (after == null) {
                        changes.add("line removed: product %s".formatted(entry.getKey()));
                    } else if (!Objects.equals(entry.getValue().quantity(), after.quantity())
                            || entry.getValue().discountPercent().compareTo(after.discountPercent()) != 0) {
                        changes.add("line changed: product %s (qty %s -> %s, discount %s%% -> %s%%)".formatted(
                                entry.getKey(), entry.getValue().quantity(), after.quantity(),
                                entry.getValue().discountPercent(), after.discountPercent()));
                    }
                });

        afterByProduct.keySet().stream()
                .filter(productId -> !beforeByProduct.containsKey(productId))
                .sorted(Comparator.comparing(UUID::toString))
                .forEach(productId -> changes.add("line added: product %s".formatted(productId)));
    }

    /** @param changedFields empty when {@code material} is false */
    public record Result(boolean material, List<String> changedFields) {
    }
}
