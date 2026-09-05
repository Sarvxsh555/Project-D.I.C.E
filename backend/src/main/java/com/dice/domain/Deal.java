package com.dice.domain;

import com.dice.domain.enums.BillingStatus;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The aggregate root. A deal starts life as an Odoo quotation and accumulates
 * evaluations, approvals and decisions as it moves through the pipeline.
 *
 * <p>Monetary rollups ({@link #subtotal}, {@link #totalAmount}, …) are derived
 * from the lines by {@code PricingService#recalculate} — do not set them by hand.
 */
@Entity
@Table(name = "deals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Deal {

    @Id
    @GeneratedValue
    private UUID id;

    /** Human-facing reference, e.g. {@code DICE-000142}. */
    @Column(name = "deal_number", nullable = false, unique = true, length = 32)
    private String dealNumber;

    /** {@code sale.order} id in Odoo. Null for deals originated in DICE. */
    @Column(name = "odoo_quotation_id", unique = true)
    private Long odooQuotationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private DealStatus status = DealStatus.DRAFT;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    /** Blended margin across all lines, as a percentage. */
    @Column(name = "margin_percent", precision = 7, scale = 4)
    @Builder.Default
    private BigDecimal marginPercent = BigDecimal.ZERO;

    /** 0-100, from {@code RiskEngine}. Higher is riskier — opposite sense to healthScore below. */
    @Column(name = "risk_score")
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", length = 16)
    @Builder.Default
    private RiskLevel riskLevel = RiskLevel.LOW;

    /** 0–100, from {@code DealHealthEngine}. Higher is healthier. */
    @Column(name = "health_score")
    @Builder.Default
    private Integer healthScore = 100;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_status", length = 32)
    @Builder.Default
    private BillingStatus billingStatus = BillingStatus.NOT_INVOICED;

    @Column(name = "requested_delivery_date")
    private LocalDate requestedDeliveryDate;

    /** Username of the owning sales rep. */
    @Column(name = "owner_username", length = 128)
    private String ownerUsername;

    @OneToMany(mappedBy = "deal", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DealLine> lines = new ArrayList<>();

    /**
     * Guards against two reps editing the same quotation — an Odoo webhook and a
     * portal counter-offer can otherwise interleave.
     */
    @Version
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /** Keeps both sides of the association in sync. */
    public void addLine(DealLine line) {
        lines.add(line);
        line.setDeal(this);
    }

    public void removeLine(DealLine line) {
        lines.remove(line);
        line.setDeal(null);
    }

    /** Weighted discount off list across the whole deal, as a percentage. */
    public BigDecimal effectiveDiscountPercent() {
        if (subtotal == null || subtotal.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return discountAmount
                .divide(subtotal, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }
}
