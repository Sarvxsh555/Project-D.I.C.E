package com.dice.repository;

import com.dice.domain.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    List<Subscription> findByDealId(UUID dealId);

    Optional<Subscription> findByDealLineId(UUID dealLineId);

    List<Subscription> findByCustomerId(UUID customerId);
}
