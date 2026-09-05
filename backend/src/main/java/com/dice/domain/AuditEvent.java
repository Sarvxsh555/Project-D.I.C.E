package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only trail. Every state change worth explaining to an auditor lands
 * here — never update or delete rows.
 */
@Entity
@Table(name = "audit_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEvent {

    @Id
    @GeneratedValue
    private UUID id;

    /** e.g. {@code DEAL}, {@code APPROVAL}. */
    @Column(name = "aggregate_type", nullable = false, length = 64)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false)
    private UUID aggregateId;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    /** Username, or {@code system} for engine-driven changes. */
    @Column(nullable = false, length = 128)
    @Builder.Default
    private String actor = "system";

    @Column(columnDefinition = "text")
    private String payload;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @PrePersist
    void onCreate() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }
}
