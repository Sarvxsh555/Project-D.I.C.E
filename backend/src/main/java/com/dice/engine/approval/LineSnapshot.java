package com.dice.engine.approval;

import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.DealLine;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * A frozen line for {@link ApprovalSnapshot} comparison purposes — product,
 * quantity, price and discount at the moment an approval was granted.
 *
 * <p>Deliberately its own tiny type rather than reusing {@code DealLine}: this
 * is a value captured in the past, disconnected from any live JPA entity, and
 * the service layer serialises a {@code List<LineSnapshot>} to JSON for
 * {@code ApprovalSnapshot.lineSnapshot} — mirrors how {@code Evaluation.policyResults}
 * serialises {@code PolicyEngine.Violation}.
 */
public record LineSnapshot(UUID productId, Integer quantity, BigDecimal unitPrice, BigDecimal discountPercent) {

    public static List<LineSnapshot> of(List<DealLine> lines) {
        return lines.stream()
                .map(line -> new LineSnapshot(
                        line.getProduct().getId(), line.getQuantity(),
                        line.getUnitPrice(), line.getDiscountPercent()))
                .toList();
    }
}
