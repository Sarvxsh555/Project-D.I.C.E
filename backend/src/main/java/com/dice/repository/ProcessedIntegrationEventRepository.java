package com.dice.repository;

import com.dice.domain.ProcessedIntegrationEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProcessedIntegrationEventRepository extends JpaRepository<ProcessedIntegrationEvent, UUID> {

    Optional<ProcessedIntegrationEvent> findByExternalEventId(String externalEventId);

    boolean existsByExternalEventId(String externalEventId);
}
