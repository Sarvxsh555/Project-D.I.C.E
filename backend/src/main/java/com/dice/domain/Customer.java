package com.dice.domain;

import com.dice.domain.enums.CustomerSegment;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A buying account, mirrored from Odoo's {@code res.partner}.
 *
 * <p>Credit fields drive {@code RiskEngine}; {@code segment} selects which
 * policies apply.
 */
@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue
    private UUID id;

    /** {@code res.partner} id in Odoo. Null until the record is synced. */
    @Column(name = "odoo_partner_id", unique = true)
    private Long odooPartnerId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CustomerSegment segment;

    /** Free-form loyalty tier (GOLD/SILVER/…); policies may key off it. */
    @Column(length = 32)
    private String tier;

    private String region;

    @Column(name = "credit_limit", precision = 18, scale = 2)
    private BigDecimal creditLimit;

    @Column(name = "outstanding_balance", precision = 18, scale = 2)
    private BigDecimal outstandingBalance;

    @Column(name = "payment_terms_days")
    private Integer paymentTermsDays;

    /** 0 (safest) – 100 (worst), maintained by {@code RiskEngine}. */
    @Column(name = "risk_score")
    private Integer riskScore;

    @Column(name = "on_time_payment_rate", precision = 5, scale = 2)
    private BigDecimal onTimePaymentRate;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /** Headroom left on the account; never negative. */
    public BigDecimal availableCredit() {
        if (creditLimit == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal used = outstandingBalance == null ? BigDecimal.ZERO : outstandingBalance;
        return creditLimit.subtract(used).max(BigDecimal.ZERO);
    }
}
