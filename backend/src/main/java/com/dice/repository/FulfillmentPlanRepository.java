package com.dice.repository;

import com.dice.domain.FulfillmentPlan;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FulfillmentPlanRepository extends JpaRepository<FulfillmentPlan, UUID> {

    @EntityGraph(attributePaths = {"lines", "lines.warehouse", "lines.product", "lines.dealLine"})
    List<FulfillmentPlan> findByDealIdOrderByCreatedAtDesc(UUID dealId);
}
