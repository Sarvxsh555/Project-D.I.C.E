package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Subscription;
import com.dice.domain.SubscriptionBillingSchedule;
import com.dice.domain.SubscriptionPlan;
import com.dice.domain.enums.BillingMode;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.SubscriptionStatus;
import com.dice.repository.DealRepository;
import com.dice.repository.SubscriptionBillingScheduleRepository;
import com.dice.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns a {@code RECURRING} deal line into a live {@link Subscription} plus
 * its {@link SubscriptionBillingSchedule}. Holds no pricing logic of its own —
 * the plan and the originating deal line remain the source of truth for price.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SubscriptionService {

    /** Only these statuses represent authoritative, confirmed sales-order state. */
    private static final java.util.Set<DealStatus> BILLABLE_STATUSES = java.util.Set.of(
            DealStatus.CONFIRMED, DealStatus.FULFILLING, DealStatus.FULFILLED, DealStatus.INVOICED);

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionBillingScheduleRepository scheduleRepository;
    private final DealRepository dealRepository;

    /**
     * Creates a subscription for every RECURRING line on a confirmed deal that
     * has a plan attached and does not already have one. Never runs against a
     * draft quotation — the same authoritative-state guard as one-time invoicing.
     */
    public List<Subscription> syncFromDeal(UUID dealId, String actor) {
        Deal deal = dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));

        if (!BILLABLE_STATUSES.contains(deal.getStatus())) {
            throw new IllegalStateException(
                    "Deal %s is %s; only confirmed orders can create subscriptions"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }

        List<Subscription> created = new java.util.ArrayList<>();
        for (DealLine line : deal.getLines()) {
            if (line.getBillingMode() != BillingMode.RECURRING || line.getSubscriptionPlan() == null) {
                continue;
            }
            created.add(createIfAbsent(deal, line, line.getSubscriptionPlan(), actor));
        }
        return created;
    }

    /** Idempotent: re-confirming a deal must not create a second subscription for the same line. */
    public Subscription createIfAbsent(Deal deal, DealLine line, SubscriptionPlan plan, String actor) {
        Optional<Subscription> existing = subscriptionRepository.findByDealLineId(line.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        LocalDate start = LocalDate.now();
        Subscription subscription = subscriptionRepository.save(Subscription.builder()
                .customer(deal.getCustomer())
                .deal(deal)
                .dealLine(line)
                .plan(plan)
                .startDate(start)
                .nextBillingDate(plan.getInterval().advance(start))
                .status(SubscriptionStatus.ACTIVE)
                .build());

        scheduleRepository.save(SubscriptionBillingSchedule.builder()
                .subscription(subscription)
                .frequency(plan.getInterval())
                .nextBillingDate(subscription.getNextBillingDate())
                .active(true)
                .build());

        log.info("Created subscription {} for deal {} line {} (actor={})",
                subscription.getId(), deal.getDealNumber(), line.getId(), actor);
        return subscription;
    }

    @Transactional(readOnly = true)
    public List<Subscription> forDeal(UUID dealId) {
        return subscriptionRepository.findByDealId(dealId);
    }

    public Subscription require(UUID subscriptionId) {
        return subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException("No subscription with id " + subscriptionId));
    }

    public Subscription cancel(UUID subscriptionId, String actor) {
        Subscription subscription = require(subscriptionId);
        subscription.setStatus(SubscriptionStatus.CANCELLED);
        scheduleRepository.findBySubscriptionId(subscriptionId)
                .ifPresent(schedule -> schedule.setActive(false));
        log.info("Cancelled subscription {} (actor={})", subscriptionId, actor);
        return subscriptionRepository.save(subscription);
    }

    /** Advances the schedule to its next cycle after a recurring invoice is raised. */
    public SubscriptionBillingSchedule advanceSchedule(UUID subscriptionId) {
        SubscriptionBillingSchedule schedule = scheduleRepository.findBySubscriptionId(subscriptionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No billing schedule for subscription " + subscriptionId));
        schedule.advance();

        subscriptionRepository.findById(subscriptionId)
                .ifPresent(subscription -> subscription.setNextBillingDate(schedule.getNextBillingDate()));

        return scheduleRepository.save(schedule);
    }

    /** Schedules due for billing today or earlier. */
    @Transactional(readOnly = true)
    public List<SubscriptionBillingSchedule> due(LocalDate asOf) {
        return scheduleRepository.findByActiveTrueAndNextBillingDateLessThanEqual(asOf);
    }
}
