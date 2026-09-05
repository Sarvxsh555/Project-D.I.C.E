package com.dice.events;

import com.dice.domain.AuditEvent;
import com.dice.repository.AuditEventRepository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Writes every published {@link DealEvent} to the audit trail.
 *
 * <p>Runs after commit, so a rolled-back transaction leaves no audit row
 * claiming something happened. That also means there is no active transaction
 * by the time this runs, hence {@code REQUIRES_NEW}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EventHandler {

    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordToAuditTrail(DealEvent event) {
        try {
            auditEventRepository.save(AuditEvent.builder()
                    .aggregateType("DEAL")
                    .aggregateId(event.dealId())
                    .eventType(event.type())
                    .actor(event.actor() == null ? "system" : event.actor())
                    .payload(serialise(event.payload()))
                    .occurredAt(event.occurredAt())
                    .build());
        } catch (RuntimeException e) {
            // The audit write must never take down the business transaction that
            // already committed — log loudly and move on.
            log.error("Failed to record audit event {} for deal {}",
                    event.type(), event.dealId(), e);
        }
    }

    private String serialise(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JacksonException e) {
            log.warn("Could not serialise event payload: {}", e.getMessage());
            return "{}";
        }
    }
}
