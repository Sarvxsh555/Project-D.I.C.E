package com.dice.domain;

import com.dice.domain.enums.AnomalySeverity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** A persisted rule-based discount-anomaly finding for one deal. */
@Entity
@Table(name = "anomaly_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnomalyAlert {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    /** What was compared, e.g. {@code DISCOUNT_PERCENT}. */
    @Column(nullable = false, length = 64)
    private String metric;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal baseline;

    @Column(name = "current_value", nullable = false, precision = 18, scale = 6)
    private BigDecimal currentValue;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal ratio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AnomalySeverity severity;

    @Column(columnDefinition = "text")
    private String reason;

    /** Open until a fresh evaluation no longer finds the anomaly, so it isn't re-raised every run. */
    @Column(nullable = false)
    @Builder.Default
    private boolean resolved = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
