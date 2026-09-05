package com.dice.domain;

import com.dice.domain.enums.DecisionOutcome;
import com.dice.domain.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * An immutable snapshot of what the engines concluded about a deal at one point
 * in time. Every inbound event produces one, which is what makes the deal's
 * history replayable in the demo.
 */
@Entity
@Table(name = "evaluations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evaluation {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    /** Event type that kicked this off, e.g. {@code DISCOUNT_CHANGED}. */
    @Column(name = "triggered_by", nullable = false, length = 64)
    private String triggeredBy;

    @Column(name = "margin_percent", precision = 7, scale = 4)
    private BigDecimal marginPercent;

    @Column(name = "discount_percent", precision = 7, scale = 4)
    private BigDecimal discountPercent;

    /** 0-100, from {@code RiskEngine}. Was computed-then-discarded before this field existed. */
    @Column(name = "risk_score")
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", length = 16)
    private RiskLevel riskLevel;

    @Column(name = "health_score")
    private Integer healthScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DecisionOutcome outcome;

    /**
     * Serialised {@code List<PolicyEngine.Violation>}. Stored as text rather than
     * jsonb so the shape can evolve without a migration.
     */
    @Column(name = "policy_results", columnDefinition = "text")
    private String policyResults;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
