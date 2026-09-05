package com.dice.repository;

import com.dice.domain.AnomalyAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnomalyAlertRepository extends JpaRepository<AnomalyAlert, UUID> {

    List<AnomalyAlert> findByDealIdOrderByCreatedAtDesc(UUID dealId);

    Optional<AnomalyAlert> findByDealIdAndMetricAndResolvedFalse(UUID dealId, String metric);
}
