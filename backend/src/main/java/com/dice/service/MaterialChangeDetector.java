package com.dice.service;

import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.Deal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Detects whether a quotation has changed materially from its last approved
 * snapshot. Purely deterministic — no I/O, no side effects.
 *
 * <p>A change is material when any of the following is true:
 * <ul>
 *   <li>The blended discount percentage moved by more than 0.5 percentage points.</li>
 *   <li>The deal total moved by more than 0.5% of the approved total.</li>
 *   <li>The set of product SKUs on the deal changed (addition, removal, or swap).</li>
 * </ul>
 *
 * <p>Any material change voids the previous approval — the deal must be re-evaluated
 * and a new approval chain started if the new evaluation still requires approval.
 */
@Component
@Slf4j
public class MaterialChangeDetector {

    /**
     * @param deal     The live deal in its current state.
     * @param snapshot The last approved snapshot to compare against.
     * @return a result describing whether a material change was detected and why.
     */
    public MaterialChangeResult detect(Deal deal, ApprovalSnapshot snapshot) {
        if (snapshot == null) {
            return MaterialChangeResult.noSnapshot();
        }

        // 1. Discount threshold check (0.5pp)
        BigDecimal currentDiscount = deal.effectiveDiscountPercent();
        if (snapshot.getDiscountPercent() != null) {
            BigDecimal discountDelta = currentDiscount
                    .subtract(snapshot.getDiscountPercent()).abs();
            if (discountDelta.compareTo(BigDecimal.valueOf(0.5)) > 0) {
                String reason = "Discount changed from %s%% to %s%% (delta %s%%)"
                        .formatted(snapshot.getDiscountPercent(), currentDiscount, discountDelta);
                log.debug("Material change detected: {}", reason);
                return MaterialChangeResult.material(reason);
            }
        }

        // 2. Total amount threshold check (0.5%)
        if (snapshot.getTotalAmount() != null
                && snapshot.getTotalAmount().signum() != 0) {
            BigDecimal totalDeltaPct = deal.getTotalAmount()
                    .subtract(snapshot.getTotalAmount()).abs()
                    .divide(snapshot.getTotalAmount(), 6, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            if (totalDeltaPct.compareTo(BigDecimal.valueOf(0.5)) > 0) {
                String reason = "Total amount changed from %s to %s (delta %s%%)"
                        .formatted(snapshot.getTotalAmount(), deal.getTotalAmount(), totalDeltaPct);
                log.debug("Material change detected: {}", reason);
                return MaterialChangeResult.material(reason);
            }
        }

        // 3. Product set change
        Set<String> approvedSkus = snapshot.getItems().stream()
                .map(com.dice.domain.ApprovalSnapshotItem::getProductSku)
                .collect(Collectors.toSet());
        Set<String> currentSkus = deal.getLines().stream()
                .map(line -> line.getProduct().getSku())
                .collect(Collectors.toSet());
        if (!Objects.equals(approvedSkus, currentSkus)) {
            String reason = "Product set changed: approved=%s, current=%s"
                    .formatted(approvedSkus, currentSkus);
            log.debug("Material change detected: {}", reason);
            return MaterialChangeResult.material(reason);
        }

        return MaterialChangeResult.none();
    }

    // ------------------------------------------------------------------

    public record MaterialChangeResult(boolean material, boolean noSnapshotPresent, String reason) {

        static MaterialChangeResult material(String reason) {
            return new MaterialChangeResult(true, false, reason);
        }

        static MaterialChangeResult none() {
            return new MaterialChangeResult(false, false, null);
        }

        static MaterialChangeResult noSnapshot() {
            return new MaterialChangeResult(false, true, null);
        }
    }
}
