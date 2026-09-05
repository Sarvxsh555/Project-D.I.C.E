package com.dice.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * One row per successfully-routed inbound Odoo/OEEG webhook event, keyed by
 * the external event id. Existence of a row is the idempotency check —
 * replaying the same event must not re-run its side effects.
 */
@Entity
@Table(name = "processed_integration_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessedIntegrationEvent {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "external_event_id", nullable = false, unique = true, length = 128)
    private String externalEventId;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(nullable = false, length = 16)
    private String result;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @PrePersist
    void onCreate() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }
}
