package com.dice.domain;

import com.dice.domain.enums.DecisionOutcome;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * The resolved answer for a deal: what happens next, and why. One decision per
 * evaluation, produced by {@code DecisionResolver}.
 */
@Entity
@Table(name = "decisions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Decision {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deal_id", nullable = false)
    private Deal deal;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id", unique = true)
    private Evaluation evaluation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DecisionOutcome outcome;

    /** Plain-English explanation shown to the rep. Never leave this blank. */
    @Column(columnDefinition = "text", nullable = false)
    private String rationale;

    /** Serialised {@code List<RecommendationEngine.Recommendation>}. */
    @Column(columnDefinition = "text")
    private String recommendations;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
