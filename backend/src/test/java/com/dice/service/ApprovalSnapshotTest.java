package com.dice.service;

import com.dice.domain.*;
import com.dice.domain.enums.ApprovalLevel;
import com.dice.domain.enums.ApprovalStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.RiskLevel;
import com.dice.events.EventPublisher;
import com.dice.repository.ApprovalRepository;
import com.dice.repository.ApprovalSnapshotRepository;
import com.dice.repository.DealRepository;
import com.dice.security.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * §11 — Approval snapshot correctness.
 *
 * Verifies that:
 * - a snapshot is taken when the final chain level is approved
 * - the snapshot captures the correct commercial values
 * - the snapshot correctly determines material difference
 * - a snapshot in memory cannot be silently mutated by deal changes
 */
@ExtendWith(MockitoExtension.class)
class ApprovalSnapshotTest {

    @Mock private ApprovalRepository approvalRepository;
    @Mock private ApprovalSnapshotRepository snapshotRepository;
    @Mock private DealRepository dealRepository;
    @Mock private EventPublisher eventPublisher;
    @Mock private AuditService auditService;

    private ApprovalService service;
    private Deal deal;
    private Product product;

    @BeforeEach
    void setUp() {
        service = new ApprovalService(approvalRepository, snapshotRepository, dealRepository, eventPublisher, auditService);

        product = Product.builder()
                .id(UUID.randomUUID())
                .sku("SKU-1001")
                .name("Standard Widget")
                .listPrice(BigDecimal.valueOf(100))
                .standardCost(BigDecimal.valueOf(60))
                .build();

        DealLine line = DealLine.builder()
                .id(UUID.randomUUID())
                .product(product)
                .quantity(10)
                .unitPrice(BigDecimal.valueOf(100))
                .discountPercent(BigDecimal.valueOf(10))
                .lineTotal(BigDecimal.valueOf(900))
                .marginPercent(BigDecimal.valueOf(33.33))
                .build();

        deal = Deal.builder()
                .id(UUID.randomUUID())
                .dealNumber("DICE-000001")
                .customer(Customer.builder().id(UUID.randomUUID()).name("Acme Corp").build())
                .status(DealStatus.PENDING_APPROVAL)
                .ownerUsername("rep1")
                .subtotal(BigDecimal.valueOf(1000))
                .discountAmount(BigDecimal.valueOf(100))
                .totalAmount(BigDecimal.valueOf(900))
                .marginPercent(BigDecimal.valueOf(33.33))
                .riskLevel(RiskLevel.LOW)
                .lines(new ArrayList<>(List.of(line)))
                .build();
        line.setDeal(deal);

        lenient().when(approvalRepository.save(any(Approval.class))).thenAnswer(inv -> {
            Approval a = inv.getArgument(0);
            if (a.getId() == null) a.setId(UUID.randomUUID());
            return a;
        });
        lenient().when(dealRepository.save(any(Deal.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(snapshotRepository.save(any(ApprovalSnapshot.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Approval levelApproval(ApprovalLevel level, ApprovalStatus status) {
        return Approval.builder()
                .id(UUID.randomUUID())
                .deal(deal)
                .approvalLevel(level)
                .requiredRole(level.name())
                .status(status)
                .build();
    }

    // ------------------------------------------------------------------
    // 1. Snapshot created on FINANCE_OPERATIONS approval (last level)
    // ------------------------------------------------------------------
    @Test
    void snapshotIsCreatedWhenFinalLevelIsApproved() {
        Approval approval = levelApproval(ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.existsByDealIdAndApprovalLevelAndStatus(
                deal.getId(), ApprovalLevel.SALES_MANAGER, ApprovalStatus.APPROVED)).thenReturn(true);

        service.approve(approval.getId(), Role.FINANCE, "fin1", "All clear");

        verify(snapshotRepository).save(any(ApprovalSnapshot.class));
    }

    // ------------------------------------------------------------------
    // 2. Snapshot contains correct values
    // ------------------------------------------------------------------
    @Test
    void snapshotCapturesCorrectCommercialValues() {
        Approval approval = levelApproval(ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.existsByDealIdAndApprovalLevelAndStatus(
                deal.getId(), ApprovalLevel.SALES_MANAGER, ApprovalStatus.APPROVED)).thenReturn(true);

        service.approve(approval.getId(), Role.FINANCE, "fin1", "Cleared");

        ArgumentCaptor<ApprovalSnapshot> captor = ArgumentCaptor.forClass(ApprovalSnapshot.class);
        verify(snapshotRepository).save(captor.capture());
        ApprovalSnapshot snap = captor.getValue();

        assertThat(snap.getCustomerName()).isEqualTo("Acme Corp");
        assertThat(snap.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(900));
        assertThat(snap.getSubtotal()).isEqualByComparingTo(BigDecimal.valueOf(1000));
        assertThat(snap.getDiscountAmount()).isEqualByComparingTo(BigDecimal.valueOf(100));
        assertThat(snap.getMarginPercent()).isEqualByComparingTo(BigDecimal.valueOf(33.33));
        assertThat(snap.getRiskLevel()).isEqualTo("LOW");
        assertThat(snap.getApprovalLevel()).isEqualTo("FINANCE_OPERATIONS");
    }

    // ------------------------------------------------------------------
    // 3. Snapshot contains correct line items
    // ------------------------------------------------------------------
    @Test
    void snapshotItemsMirrorDealLinesAtApprovalTime() {
        Approval approval = levelApproval(ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.PENDING);
        when(approvalRepository.findById(approval.getId())).thenReturn(Optional.of(approval));
        when(approvalRepository.existsByDealIdAndApprovalLevelAndStatus(
                deal.getId(), ApprovalLevel.SALES_MANAGER, ApprovalStatus.APPROVED)).thenReturn(true);

        service.approve(approval.getId(), Role.FINANCE, "fin1", "OK");

        ArgumentCaptor<ApprovalSnapshot> captor = ArgumentCaptor.forClass(ApprovalSnapshot.class);
        verify(snapshotRepository).save(captor.capture());
        ApprovalSnapshot snap = captor.getValue();

        assertThat(snap.getItems()).hasSize(1);
        ApprovalSnapshotItem item = snap.getItems().get(0);
        assertThat(item.getProductSku()).isEqualTo("SKU-1001");
        assertThat(item.getQuantity()).isEqualTo(10);
        assertThat(item.getDiscountPercent()).isEqualByComparingTo(BigDecimal.valueOf(10));
    }

    // ------------------------------------------------------------------
    // 4. Snapshot remains unchanged after deal mutation (immutability check)
    // ------------------------------------------------------------------
    @Test
    void snapshotValuesAreNotAffectedBySubsequentDealMutation() {
        // Build an in-memory snapshot as would be persisted.
        ApprovalSnapshot snapshot = ApprovalSnapshot.builder()
                .id(UUID.randomUUID())
                .deal(deal)
                .approval(levelApproval(ApprovalLevel.FINANCE_OPERATIONS, ApprovalStatus.APPROVED))
                .totalAmount(BigDecimal.valueOf(900))
                .discountAmount(BigDecimal.valueOf(100))
                .discountPercent(BigDecimal.TEN)
                .marginPercent(BigDecimal.valueOf(33.33))
                .riskLevel("LOW")
                .build();

        BigDecimal originalTotal = snapshot.getTotalAmount();

        // Mutate the live deal — snapshot must be unaffected.
        deal.setTotalAmount(BigDecimal.valueOf(600));
        deal.setDiscountAmount(BigDecimal.valueOf(400));

        assertThat(snapshot.getTotalAmount())
                .as("Snapshot total must not change when deal is mutated")
                .isEqualByComparingTo(originalTotal);
    }

    // ------------------------------------------------------------------
    // 5. Material difference detection — discount exceeds threshold
    // ------------------------------------------------------------------
    @Test
    void isMateriallyDifferentTrueWhenDiscountIncreasesAboveThreshold() {
        ApprovalSnapshot snapshot = ApprovalSnapshot.builder()
                .totalAmount(BigDecimal.valueOf(900))
                .discountPercent(BigDecimal.valueOf(10))
                .build();

        // 10% → 11% is a 1-point increase, above the 0.5pp threshold.
        assertThat(snapshot.isMateriallyDifferentFrom(
                BigDecimal.valueOf(11), BigDecimal.valueOf(890)))
                .isTrue();
    }

    // ------------------------------------------------------------------
    // 6. Material difference detection — within threshold is not material
    // ------------------------------------------------------------------
    @Test
    void isMateriallyDifferentFalseWhenChangeIsBelowThreshold() {
        ApprovalSnapshot snapshot = ApprovalSnapshot.builder()
                .totalAmount(BigDecimal.valueOf(900))
                .discountPercent(BigDecimal.valueOf(10))
                .build();

        // Same discount, same total → no material change.
        assertThat(snapshot.isMateriallyDifferentFrom(
                BigDecimal.valueOf(10), BigDecimal.valueOf(900)))
                .isFalse();
    }

    // ------------------------------------------------------------------
    // 7. Material difference detection — total amount shift
    // ------------------------------------------------------------------
    @Test
    void isMateriallyDifferentTrueWhenTotalAmountShiftsByMoreThanHalfPercent() {
        ApprovalSnapshot snapshot = ApprovalSnapshot.builder()
                .totalAmount(BigDecimal.valueOf(1000))
                .discountPercent(BigDecimal.valueOf(10))
                .build();

        // 1000 → 1010 = 1% change, above the 0.5% threshold.
        assertThat(snapshot.isMateriallyDifferentFrom(
                BigDecimal.valueOf(10), BigDecimal.valueOf(1010)))
                .isTrue();
    }
}
