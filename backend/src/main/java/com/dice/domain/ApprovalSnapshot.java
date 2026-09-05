package com.dice.domain;

import com.dice.domain.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * The approval-sensitive deal state at the moment an approval was fully
 * granted — pricing, discounts, quantities, margin, risk, payment terms.
 *
 * <p>A deal has at most one <em>active</em> ({@link #superseded} false)
 * snapshot at a time, enforced by a partial unique index
 * ({@code idx_approval_snapshots_one_active}). When {@code MaterialChangeDetector}
 * finds the live deal has drifted from it, {@code DealService} marks it
 * superseded (never deletes it — it's the audit record of what was actually
 * approved) and, once the deal is re-approved, a fresh snapshot is captured by
 * {@code ApprovalService}.
 *
 * <p>{@link #lineSnapshot} is a JSON array of {@code {productId, quantity,
 * unitPrice, discountPercent}}, serialised by the service layer — see
 * {@code MaterialChangeDetector.LineSnapshot}. Kept as text rather than a
 * child entity for the same reason {@code Evaluation.policyResults} is: it's a
 * frozen record of the past, never queried into, and the shape may evolve.
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

    /** The evaluation that produced the decision this approval was granted for. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id")
    private Evaluation evaluation;

    /** Role of the approval that completed the deal — where a reapproval routes back to. */
    @Column(name = "approved_by_role", nullable = false, length = 64)
    private String approvedByRole;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "margin_percent", nullable = false, precision = 7, scale = 4)
    private BigDecimal marginPercent;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 16)
    private RiskLevel riskLevel;

    @Column(name = "customer_payment_terms_days")
    private Integer customerPaymentTermsDays;

    @Column(name = "line_snapshot", nullable = false, columnDefinition = "text")
    private String lineSnapshot;

    @Column(name = "captured_at", nullable = false, updatable = false)
    private Instant capturedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean superseded = false;

    @Column(name = "superseded_at")
    private Instant supersededAt;

    /** Human-readable list of what changed — what invalidated this snapshot. */
    @Column(name = "superseded_reason", columnDefinition = "text")
    private String supersededReason;

    @PrePersist
    void onCreate() {
        if (capturedAt == null) {
            capturedAt = Instant.now();
        }
    }

    public void supersede(String reason) {
        this.superseded = true;
        this.supersededAt = Instant.now();
        this.supersededReason = reason;
    }
}
