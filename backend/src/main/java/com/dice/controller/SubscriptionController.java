package com.dice.controller;

import com.dice.domain.Deal;
import com.dice.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final DealRepository dealRepository;

    @GetMapping
    public List<Map<String, Object>> list() {
        return dealRepository.findAll().stream()
                .map(this::mapDealToSubscription)
                .toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        return mapDealToSubscription(resolveDeal(id));
    }

    @PostMapping("/{id}/pause")
    public Map<String, Object> pause(@PathVariable String id) {
        Map<String, Object> sub = mapDealToSubscription(resolveDeal(id));
        sub.put("status", "PAUSED");
        return sub;
    }

    @PostMapping("/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable String id) {
        Map<String, Object> sub = mapDealToSubscription(resolveDeal(id));
        sub.put("status", "CANCELLED");
        return sub;
    }

    private Map<String, Object> mapDealToSubscription(Deal deal) {
        Map<String, Object> sub = new LinkedHashMap<>();
        String subId = "sub-" + deal.getDealNumber().toLowerCase();
        sub.put("id", subId);
        sub.put("dealId", deal.getId());
        sub.put("dealNumber", deal.getDealNumber());
        sub.put("customerName", deal.getCustomer().getName());
        sub.put("planName", "Enterprise 360 SLA (" + deal.getCustomer().getName() + ")");
        BigDecimal mrr = deal.getTotalAmount() != null
                ? deal.getTotalAmount().divide(BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.valueOf(5000);
        sub.put("amount", mrr);
        sub.put("billingInterval", "Monthly");
        sub.put("startDate", LocalDate.now().minusMonths(2).toString());
        sub.put("nextBillingDate", LocalDate.now().plusMonths(1).toString());
        sub.put("status", "ACTIVE");
        return sub;
    }

    private Deal resolveDeal(String idOrNumber) {
        String clean = idOrNumber.replace("sub-", "").toUpperCase().trim();
        try {
            UUID id = UUID.fromString(idOrNumber);
            return dealRepository.findWithLinesById(id)
                    .orElseGet(() -> dealRepository.findByDealNumber(clean)
                            .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                                    .orElseThrow(() -> new IllegalArgumentException("No subscription for: " + idOrNumber))));
        } catch (IllegalArgumentException e) {
            return dealRepository.findByDealNumber(clean)
                    .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("No subscription for: " + idOrNumber)));
        }
    }
}
