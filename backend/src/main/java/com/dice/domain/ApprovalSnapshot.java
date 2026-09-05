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

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "margin_percent", precision = 7, scale = 4)
    private BigDecimal marginPercent;

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
}
