package com.dice.controller;

import com.dice.domain.ApprovalSnapshot;
import com.dice.domain.ApprovalSnapshotItem;
import com.dice.domain.enums.ApprovalLevel;
import com.dice.repository.ApprovalSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read-only view of approval snapshots for a deal.
 *
 * <p>Snapshots are immutable historical records — there are no mutating endpoints
 * here. The authoritative approved commercial state must never be editable after
 * the fact.
 */
@RestController
@RequestMapping("/api/deals/{dealId}/snapshots")
@RequiredArgsConstructor
public class SnapshotController {

    private final ApprovalSnapshotRepository snapshotRepository;

    /** All snapshots for a deal, newest first. */
    @GetMapping
    public List<SnapshotView> forDeal(@PathVariable UUID dealId) {
        return snapshotRepository.findByDealIdOrderByCapturedAtDesc(dealId)
                .stream()
                .map(SnapshotView::from)
                .toList();
    }

    @GetMapping("/{id}")
    public SnapshotView get(@PathVariable UUID dealId, @PathVariable UUID id) {
        ApprovalSnapshot snap = snapshotRepository.findById(id)
                .filter(s -> s.getDeal().getId().equals(dealId))
                .orElseThrow(() -> new IllegalArgumentException("No snapshot " + id + " for deal " + dealId));
        return SnapshotView.from(snap);
    }

    // ------------------------------------------------------------------
    // Wire formats
    // ------------------------------------------------------------------

    public record SnapshotItemView(
            String productSku,
            String productName,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal discountPercent,
            BigDecimal lineTotal,
            BigDecimal marginPercent) {

        static SnapshotItemView from(ApprovalSnapshotItem item) {
            return new SnapshotItemView(
                    item.getProductSku(), item.getProductName(), item.getQuantity(),
                    item.getUnitPrice(), item.getDiscountPercent(),
                    item.getLineTotal(), item.getMarginPercent());
        }
    }

    public record SnapshotView(
            UUID id,
            UUID dealId,
            UUID approvalId,
            Long dealVersion,
            String customerName,
            String currency,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal discountPercent,
            BigDecimal totalAmount,
            BigDecimal marginPercent,
            String riskLevel,
            String approvalLevel,
            Instant capturedAt,
            List<SnapshotItemView> items) {

        static SnapshotView from(ApprovalSnapshot s) {
            return new SnapshotView(
                    s.getId(),
                    s.getDeal().getId(),
                    s.getApproval().getId(),
                    s.getDealVersion(),
                    s.getCustomerName(),
                    s.getCurrency(),
                    s.getSubtotal(),
                    s.getDiscountAmount(),
                    s.getDiscountPercent(),
                    s.getTotalAmount(),
                    s.getMarginPercent(),
                    s.getRiskLevel(),
                    s.getApprovalLevel(),
                    s.getCapturedAt(),
                    s.getItems().stream().map(SnapshotItemView::from).toList());
        }
    }
}
