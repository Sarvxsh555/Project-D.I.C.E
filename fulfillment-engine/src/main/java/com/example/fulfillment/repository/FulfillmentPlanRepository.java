package com.example.fulfillment.repository;

import com.example.fulfillment.model.FulfillmentPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FulfillmentPlanRepository extends JpaRepository<FulfillmentPlan, Long> {
    Optional<FulfillmentPlan> findByOrderId(Long orderId);
}
