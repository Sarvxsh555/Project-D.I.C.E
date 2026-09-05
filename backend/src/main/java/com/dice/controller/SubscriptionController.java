package com.dice.controller;

import com.dice.domain.Subscription;
import com.dice.domain.enums.SubscriptionStatus;
import com.dice.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/api/deals/{dealId}/subscriptions")
    public List<SubscriptionView> forDeal(@PathVariable UUID dealId) {
        return subscriptionService.forDeal(dealId).stream().map(SubscriptionView::from).toList();
    }

    @PostMapping("/api/deals/{dealId}/subscriptions/sync")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public List<SubscriptionView> sync(@PathVariable UUID dealId, Authentication authentication) {
        return subscriptionService.syncFromDeal(dealId, DealController.actorOf(authentication)).stream()
                .map(SubscriptionView::from).toList();
    }

    @GetMapping("/api/subscriptions/{id}")
    public SubscriptionView get(@PathVariable UUID id) {
        return SubscriptionView.from(subscriptionService.require(id));
    }

    @PostMapping("/api/subscriptions/{id}/cancel")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public SubscriptionView cancel(@PathVariable UUID id, Authentication authentication) {
        return SubscriptionView.from(subscriptionService.cancel(id, DealController.actorOf(authentication)));
    }

    public record SubscriptionView(UUID id, UUID customerId, UUID dealId, UUID dealLineId, UUID planId,
                                   LocalDate startDate, LocalDate nextBillingDate, SubscriptionStatus status) {
        static SubscriptionView from(Subscription subscription) {
            return new SubscriptionView(subscription.getId(), subscription.getCustomer().getId(),
                    subscription.getDeal().getId(), subscription.getDealLine().getId(),
                    subscription.getPlan().getId(), subscription.getStartDate(),
                    subscription.getNextBillingDate(), subscription.getStatus());
        }
    }
}
