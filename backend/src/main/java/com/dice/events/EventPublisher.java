package com.dice.events;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * The only way domain code should raise a {@link DealEvent}.
 *
 * <p>Wraps Spring's publisher so the transport can change — an outbox table, a
 * broker — without touching every call site.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    private final ApplicationEventPublisher delegate;

    public void publish(DealEvent event) {
        log.debug("Publishing {} for deal {}", event.type(), event.dealId());
        delegate.publishEvent(event);
    }

    public void publish(String type, UUID dealId, String actor) {
        publish(DealEvent.of(type, dealId, actor));
    }

    public void publish(String type, UUID dealId, String actor, Map<String, Object> payload) {
        publish(DealEvent.of(type, dealId, actor, payload));
    }
}
