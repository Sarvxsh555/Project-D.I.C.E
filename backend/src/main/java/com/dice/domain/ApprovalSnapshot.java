package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The commercial state actually approved, frozen at the moment a quotation
 * clears its final sequential sign-off. {@link Deal} and {@link DealLine} stay
 * live and mutable after this point, so without a snapshot there would be no
 * record of what a since-edited or since-repriced deal looked like when it
 * was approved.
 */
@Entity
@Table(name = "approval_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalSnapshot {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    /** The FINANCE_OPERATIONS approval whose clearance finalised the quotation. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "approval_id", nullable = false)
    private Approval approval;

    /**
     * The JPA {@code @Version} counter on {@link Deal} at snapshot time.
     * A later version number is a quick signal that the deal row was mutated.
     */
    @Column(name = "deal_version")
    private Long dealVersion;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal discountAmount;

    /** Blended discount at snapshot time; used for material-change comparison. */
    @Column(name = "discount_percent", precision = 7, scale = 4)
    private BigDecimal discountPercent;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "margin_percent", precision = 7, scale = 4)
    private BigDecimal marginPercent;

    @Column(name = "risk_level")
    private String riskLevel;

    @Column(name = "approval_level")
    private String approvalLevel;

    @Column(name = "captured_at", nullable = false, updatable = false)
    private Instant capturedAt;

    @OneToMany(mappedBy = "snapshot", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ApprovalSnapshotItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (capturedAt == null) {
            capturedAt = Instant.now();
        }
    }

    public void addItem(ApprovalSnapshotItem item) {
        items.add(item);
        item.setSnapshot(this);
    }

    /**
     * Returns {@code true} when the current deal's commercial values have moved
     * materially from the state this snapshot captured.
     *
     * <p>Threshold: ½ percentage-point on discount or ½ percent on total amount.
     * Any change this large voids the original approval.
     */
    public boolean isMateriallyDifferentFrom(BigDecimal currentDiscountPercent,
                                             BigDecimal currentTotalAmount) {
        if (discountPercent != null && currentDiscountPercent != null) {
            BigDecimal discountDelta = currentDiscountPercent
                    .subtract(discountPercent).abs();
            if (discountDelta.compareTo(BigDecimal.valueOf(0.5)) > 0) {
                return true;
            }
        }
        if (totalAmount != null && currentTotalAmount != null
                && totalAmount.signum() != 0) {
            BigDecimal totalDeltaPct = currentTotalAmount
                    .subtract(totalAmount).abs()
                    .divide(totalAmount, 6, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            if (totalDeltaPct.compareTo(BigDecimal.valueOf(0.5)) > 0) {
                return true;
            }
        }
        return false;
    }
}
