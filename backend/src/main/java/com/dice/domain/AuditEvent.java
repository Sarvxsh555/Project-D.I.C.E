package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Append-only trail. Every state change worth explaining to an auditor lands
 * here — never update or delete rows.
 *
 * <p>{@code oldValue} and {@code newValue} carry the before/after state of
 * the changed field in a structured, queryable form rather than buried in
 * the opaque {@code payload} blob.
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

    /** Serialised representation of the value before the change. */
    @Column(name = "old_value", columnDefinition = "text")
    private String oldValue;

    /** Serialised representation of the value after the change. */
    @Column(name = "new_value", columnDefinition = "text")
    private String newValue;

    /** Human-readable reason for the change (required for approval actions). */
    @Column(columnDefinition = "text")
    private String reason;

    /**
     * Supplemental JSON payload for context that does not fit the old/new
     * pattern — e.g. event metadata, deal number.  Optional; prefer
     * {@code oldValue}/{@code newValue} for the actual changed data.
     */
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
