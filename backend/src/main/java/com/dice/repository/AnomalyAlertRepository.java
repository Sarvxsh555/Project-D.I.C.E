package com.dice.repository;

import com.dice.domain.AnomalyAlert;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnomalyAlertRepository extends JpaRepository<AnomalyAlert, UUID> {

    @EntityGraph(attributePaths = {"deal", "deal.customer"})
    List<AnomalyAlert> findByDealIdOrderByCreatedAtDesc(UUID dealId);

    Optional<AnomalyAlert> findByDealIdAndMetricAndResolvedFalse(UUID dealId, String metric);

    /** Cross-deal surveillance feed (DealHealthPage) — everywhere else here
     *  reads one deal's alerts. */
    @EntityGraph(attributePaths = {"deal", "deal.customer"})
    List<AnomalyAlert> findByResolvedFalseOrderByCreatedAtDesc();
}
