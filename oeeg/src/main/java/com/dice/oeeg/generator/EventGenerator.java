package com.dice.oeeg.generator;

import com.dice.oeeg.events.EventType;
import com.dice.oeeg.events.OutboundEvent;
import com.dice.oeeg.payload.PayloadBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Turns a scenario step (a wire-format type name plus a raw payload map) into a
 * validated {@link OutboundEvent}.
 *
 * <p>This is the one place a scenario's declared event type is checked against
 * the OEEG-emittable whitelist ({@link EventType}) and its payload checked for
 * required fields — a typo in scenario JSON fails here, before any HTTP call,
 * with a message naming exactly what's wrong.
 */
@Component
@RequiredArgsConstructor
public class EventGenerator {

    private final PayloadBuilder payloadBuilder;

    /**
     * @throws IllegalArgumentException if {@code wireType} is not OEEG-emittable,
     *         or {@code rawPayload} is missing a required field
     */
    public OutboundEvent generate(String wireType, Map<String, Object> rawPayload) {
        EventType type = EventType.fromWireName(wireType);
        Map<String, Object> payload = rawPayload == null ? Map.of() : rawPayload;
        payloadBuilder.validate(type, payload);
        return new OutboundEvent(type, payload, Instant.now());
    }
}
