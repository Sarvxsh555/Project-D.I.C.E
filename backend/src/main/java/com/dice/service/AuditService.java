package com.dice.service;

import com.dice.domain.AuditEvent;
import com.dice.repository.AuditEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Centralised, generic audit trail.
 *
 * <p>Other modules call {@link #record} rather than implementing their own
 * audit logic. The audit event is always persisted in the caller's active
 * transaction so it succeeds or rolls back atomically with the business
 * operation.
 *
 * <p>Audit information comes exclusively from backend operations — the
 * actor is always the authenticated backend principal, never a value
 * supplied by the frontend.
 *
 * <p>Records are append-only by contract: never mutate or delete rows.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    /**
     * Records a state-change audit event.
     *
     * @param entityType  Aggregate type name, e.g. {@code DEAL}, {@code APPROVAL}.
     * @param entityId    UUID of the affected entity.
     * @param action      Event type label, e.g. {@code DISCOUNT_CHANGED}.
     * @param actor       Authenticated username performing the operation.
     *                    <em>Never</em> accept this value from the frontend.
     * @param oldValue    Serialised representation of the value before the change.
     * @param newValue    Serialised representation of the value after the change.
     * @param reason      Human-readable explanation (required for approvals/rejections).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public AuditEvent record(String entityType,
                             UUID entityId,
                             String action,
                             String actor,
                             String oldValue,
                             String newValue,
                             String reason) {
        AuditEvent event = AuditEvent.builder()
                .aggregateType(entityType)
                .aggregateId(entityId)
                .eventType(action)
                .actor(actor != null ? actor : "system")
                .oldValue(oldValue)
                .newValue(newValue)
                .reason(reason)
                .build();

        AuditEvent saved = auditEventRepository.save(event);
        log.debug("Audit: {} {} by {} — {} → {}",
                entityType, action, actor, oldValue, newValue);
        return saved;
    }

    /**
     * Convenience overload for events that do not have an old/new value
     * distinction (e.g. deal creation).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public AuditEvent record(String entityType,
                             UUID entityId,
                             String action,
                             String actor,
                             String reason) {
        return record(entityType, entityId, action, actor, null, null, reason);
    }

    // ------------------------------------------------------------------
    // Named action constants — keeps call sites consistent.
    // ------------------------------------------------------------------

    public static final String DEAL          = "DEAL";
    public static final String APPROVAL      = "APPROVAL";

    public static final String DISCOUNT_CHANGED  = "DISCOUNT_CHANGED";
    public static final String QUOTATION_EDITED  = "QUOTATION_EDITED";
    public static final String APPROVED          = "APPROVED";
    public static final String REJECTED          = "REJECTED";
    public static final String RETURNED          = "RETURNED";
    public static final String APPROVAL_INVALIDATED = "APPROVAL_INVALIDATED";
}
