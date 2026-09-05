package com.dice.repository;

import com.dice.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    List<AuditEvent> findByAggregateTypeAndAggregateIdOrderByOccurredAtDesc(
            String aggregateType, UUID aggregateId);

    List<AuditEvent> findTop50ByOrderByOccurredAtDesc();

    /** All audit events for a specific entity regardless of type — useful for deal-level audit trail. */
    List<AuditEvent> findByAggregateIdOrderByOccurredAtDesc(UUID aggregateId);
}
