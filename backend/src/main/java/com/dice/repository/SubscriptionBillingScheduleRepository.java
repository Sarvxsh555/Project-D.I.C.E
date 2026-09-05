package com.dice.repository;

import com.dice.domain.SubscriptionBillingSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionBillingScheduleRepository extends JpaRepository<SubscriptionBillingSchedule, UUID> {

    Optional<SubscriptionBillingSchedule> findBySubscriptionId(UUID subscriptionId);

    List<SubscriptionBillingSchedule> findByActiveTrueAndNextBillingDateLessThanEqual(LocalDate date);
}
