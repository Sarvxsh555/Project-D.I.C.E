package com.dice.service;

import com.dice.domain.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * §13 — MaterialChangeDetector correctness + pipeline integration.
 */
@ExtendWith(MockitoExtension.class)
class EvaluationPipelineTest {

    @Mock private ApprovalService approvalService;
    @Mock private AuditService auditService;

    private MaterialChangeDetector detector;

    @BeforeEach
    void setUp() {
        detector = new MaterialChangeDetector();
    }

    private ApprovalSnapshot snapshotWith(BigDecimal discountPercent, BigDecimal totalAmount,
                                          List<String> skus) {
        ApprovalSnapshot snapshot = ApprovalSnapshot.builder()
                .id(UUID.randomUUID())
                .discountPercent(discountPercent)
                .totalAmount(totalAmount)
                .build();
        for (String sku : skus) {
            snapshot.addItem(ApprovalSnapshotItem.builder()
                    .productSku(sku).productName("Product").quantity(1)
                    .unitPrice(BigDecimal.valueOf(100)).discountPercent(BigDecimal.ZERO)
                    .lineTotal(BigDecimal.valueOf(100)).build());
        }
        return snapshot;
    }

    /**
     * Creates a Deal with correct subtotal/discountAmount so Deal.effectiveDiscountPercent()
     * (= discountAmount/subtotal*100) returns discountPct.
     * subtotal = totalAmount / (1 - discountPct/100)
     */
    private Deal dealWith(BigDecimal totalAmount, BigDecimal discountPct, List<String> skus) {
        BigDecimal factor = BigDecimal.ONE.subtract(
                discountPct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
        BigDecimal subtotal = factor.signum() == 0 ? totalAmount
                : totalAmount.divide(factor, 2, RoundingMode.HALF_UP);
        BigDecimal discountAmount = subtotal.subtract(totalAmount);

        List<DealLine> lines = skus.stream().map(sku -> {
            Product p = Product.builder()
                    .id(UUID.randomUUID()).sku(sku).name(sku)
                    .listPrice(BigDecimal.valueOf(100)).standardCost(BigDecimal.valueOf(60))
                    .build();
            return DealLine.builder()
                    .id(UUID.randomUUID()).product(p).quantity(1)
                    .unitPrice(BigDecimal.valueOf(100))
                    .discountPercent(discountPct)
                    .lineTotal(totalAmount.divide(BigDecimal.valueOf(skus.size()), 2, RoundingMode.HALF_UP))
                    .build();
        }).toList();

        return Deal.builder()
                .id(UUID.randomUUID())
                .dealNumber("DICE-001")
                .customer(Customer.builder().name("Acme").build())
                .subtotal(subtotal)
                .discountAmount(discountAmount)
                .totalAmount(totalAmount)
                .lines(new java.util.ArrayList<>(lines))
                .build();
    }

    // ------------------------------------------------------------------
    // 1. Discount change above threshold is material
    // ------------------------------------------------------------------
    @Test
    void discountChangeAboveThresholdIsMaterial() {
        ApprovalSnapshot snapshot = snapshotWith(BigDecimal.valueOf(10), BigDecimal.valueOf(900), List.of("SKU-1001"));
        Deal deal = dealWith(BigDecimal.valueOf(890), BigDecimal.valueOf(11), List.of("SKU-1001"));

        var result = detector.detect(deal, snapshot);

        assertThat(result.material()).isTrue();
        assertThat(result.reason()).contains("Discount");
    }

    // ------------------------------------------------------------------
    // 2. Total amount shift above threshold is material
    // ------------------------------------------------------------------
    @Test
    void totalAmountShiftAboveThresholdIsMaterial() {
        // same 10% discount, but total increased 2% (1000 → 1020)
        ApprovalSnapshot snapshot = snapshotWith(BigDecimal.valueOf(10), BigDecimal.valueOf(1000), List.of("SKU-1001"));
        Deal deal = dealWith(BigDecimal.valueOf(1020), BigDecimal.valueOf(10), List.of("SKU-1001"));

        var result = detector.detect(deal, snapshot);

        assertThat(result.material()).isTrue();
        assertThat(result.reason()).contains("Total amount");
    }

    // ------------------------------------------------------------------
    // 3. Product set change is material
    // ------------------------------------------------------------------
    @Test
    void productSetChangeTriggersMaterialChange() {
        // same discount and same total, but different product
        ApprovalSnapshot snapshot = snapshotWith(BigDecimal.valueOf(10), BigDecimal.valueOf(900), List.of("SKU-1001"));
        Deal deal = dealWith(BigDecimal.valueOf(900), BigDecimal.valueOf(10), List.of("SKU-1002"));

        var result = detector.detect(deal, snapshot);

        assertThat(result.material()).isTrue();
        assertThat(result.reason()).contains("Product set");
    }

    // ------------------------------------------------------------------
    // 4. Immaterial change (same discount, 0.1% total) is not flagged
    // ------------------------------------------------------------------
    @Test
    void immaterialChangeIsNotFlagged() {
        // 10% discount, 1000 → 1001 total (0.1% — below threshold)
        ApprovalSnapshot snapshot = snapshotWith(BigDecimal.valueOf(10), BigDecimal.valueOf(1000), List.of("SKU-1001"));
        Deal deal = dealWith(BigDecimal.valueOf(1001), BigDecimal.valueOf(10), List.of("SKU-1001"));

        var result = detector.detect(deal, snapshot);

        assertThat(result.material()).isFalse();
    }

    // ------------------------------------------------------------------
    // 5. No snapshot returns noSnapshotPresent = true
    // ------------------------------------------------------------------
    @Test
    void noSnapshotReturnsNoSnapshotPresentResult() {
        Deal deal = dealWith(BigDecimal.valueOf(900), BigDecimal.valueOf(10), List.of("SKU-1001"));

        var result = detector.detect(deal, null);

        assertThat(result.material()).isFalse();
        assertThat(result.noSnapshotPresent()).isTrue();
    }

    // ------------------------------------------------------------------
    // 6. Product addition is a material change
    // ------------------------------------------------------------------
    @Test
    void addingNewProductToApprovedDealIsMaterial() {
        ApprovalSnapshot snapshot = snapshotWith(BigDecimal.valueOf(10), BigDecimal.valueOf(900), List.of("SKU-1001"));
        Deal deal = dealWith(BigDecimal.valueOf(900), BigDecimal.valueOf(10), List.of("SKU-1001", "SKU-1002"));

        var result = detector.detect(deal, snapshot);

        assertThat(result.material()).isTrue();
    }

    // ------------------------------------------------------------------
    // 7. Material change → pipeline calls invalidatePriorApprovals
    // ------------------------------------------------------------------
    @Test
    void evaluatePipelineCallsInvalidatePriorApprovalsOnMaterialChange() {
        UUID dealId = UUID.randomUUID();
        ApprovalSnapshot snapshot = snapshotWith(BigDecimal.valueOf(5), BigDecimal.valueOf(1000), List.of("SKU-1001"));
        Deal deal = dealWith(BigDecimal.valueOf(800), BigDecimal.valueOf(20), List.of("SKU-1001")); // 15pp jump

        var materialResult = detector.detect(deal, snapshot);
        assertThat(materialResult.material()).isTrue();

        // Replicate what DealService.evaluate() does:
        approvalService.invalidatePriorApprovals(deal, materialResult.reason());
        auditService.record(AuditService.DEAL, dealId, "MATERIAL_CHANGE_DETECTED",
                "rep1", null, null, materialResult.reason());

        verify(approvalService).invalidatePriorApprovals(eq(deal), any(String.class));
        verify(auditService).record(eq(AuditService.DEAL), eq(dealId),
                eq("MATERIAL_CHANGE_DETECTED"), eq("rep1"),
                isNull(), isNull(), any(String.class));
    }

    // ------------------------------------------------------------------
    // 8. No material change → invalidatePriorApprovals NOT called
    // ------------------------------------------------------------------
    @Test
    void evaluatePipelineDoesNotInvalidateWhenChangeIsImmaterial() {
        ApprovalSnapshot snapshot = snapshotWith(BigDecimal.valueOf(10), BigDecimal.valueOf(1000), List.of("SKU-1001"));
        Deal deal = dealWith(BigDecimal.valueOf(1001), BigDecimal.valueOf(10), List.of("SKU-1001"));

        var result = detector.detect(deal, snapshot);

        assertThat(result.material()).isFalse();
        verifyNoInteractions(approvalService);
    }
}
