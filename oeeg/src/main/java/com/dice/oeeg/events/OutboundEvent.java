package com.dice.oeeg.events;

import java.time.Instant;
import java.util.Map;

/**
 * A validated event ready to be transmitted.
 *
 * <p>This is OEEG's internal representation, not the wire format — the wire
 * format (see {@code publisher.EventPublisher}) is exactly {@code {type, payload}},
 * matching the backend's real, live contract today. {@link #generatedAt} exists
 * for OEEG's own logging/history and is intentionally not sent over the wire;
 * see docs/event-contracts.md for why the envelope isn't richer yet.
 */
public record OutboundEvent(EventType type, Map<String, Object> payload, Instant generatedAt) {

    public OutboundEvent {
        payload = payload == null ? Map.of() : Map.copyOf(payload);
    }
}
