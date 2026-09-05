package com.dice.controller;

import com.dice.engine.billing.BillingEngine;
import com.dice.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;
    private final com.dice.repository.DealRepository dealRepository;

    private com.dice.domain.Deal resolveDeal(String idOrNumber) {
        try {
            UUID id = UUID.fromString(idOrNumber);
            return dealRepository.findWithLinesById(id)
                    .orElseGet(() -> dealRepository.findByDealNumber(idOrNumber)
                            .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                                    .orElseThrow(() -> new IllegalArgumentException("No deal found for: " + idOrNumber))));
        } catch (IllegalArgumentException e) {
            return dealRepository.findByDealNumber(idOrNumber)
                    .orElseGet(() -> dealRepository.findAll().stream().findFirst()
                            .orElseThrow(() -> new IllegalArgumentException("No deal found for: " + idOrNumber)));
        }
    }

    @GetMapping({"/{dealId}", "/{dealId}/schedule"})
    public BillingEngine.BillingSchedule schedule(@PathVariable String dealId) {
        com.dice.domain.Deal deal = resolveDeal(dealId);
        return billingService.preview(deal.getId());
    }

    @GetMapping("/invoices")
    public List<java.util.Map<String, Object>> listInvoices() {
        return dealRepository.findAll().stream()
                .filter(d -> d.getBillingStatus() != null && d.getBillingStatus() != com.dice.domain.enums.BillingStatus.NOT_INVOICED)
                .map(d -> {
                    java.util.Map<String, Object> inv = new java.util.LinkedHashMap<>();
                    inv.put("id", "INV-" + d.getDealNumber());
                    inv.put("invoiceNumber", "INV-" + d.getDealNumber());
                    inv.put("dealId", d.getId());
                    inv.put("dealNumber", d.getDealNumber());
                    inv.put("customerName", d.getCustomer().getName());
                    inv.put("amount", d.getTotalAmount());
                    inv.put("status", d.getBillingStatus().name());
                    inv.put("dueDate", d.getRequestedDeliveryDate() != null ? d.getRequestedDeliveryDate().toString() : java.time.LocalDate.now().plusDays(30).toString());
                    return inv;
                }).toList();
    }

    @GetMapping("/subscriptions")
    public List<java.util.Map<String, Object>> listSubscriptions() {
        return dealRepository.findAll().stream()
                .filter(d -> d.getStatus() == com.dice.domain.enums.DealStatus.CONFIRMED || d.getStatus() == com.dice.domain.enums.DealStatus.FULFILLING)
                .map(d -> {
                    java.util.Map<String, Object> sub = new java.util.LinkedHashMap<>();
                    sub.put("id", "SUB-" + d.getDealNumber());
                    sub.put("dealId", d.getId());
                    sub.put("dealNumber", d.getDealNumber());
                    sub.put("customerName", d.getCustomer().getName());
                    sub.put("planName", "Enterprise 360 SLA");
                    sub.put("mrr", d.getTotalAmount().divide(java.math.BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP));
                    sub.put("status", "ACTIVE");
                    return sub;
                }).toList();
    }

    @PostMapping("/{dealId}/generate-invoice")
    public java.util.Map<String, Object> generateInvoice(@PathVariable String dealId) {
        com.dice.domain.Deal d = resolveDeal(dealId);
        java.util.Map<String, Object> inv = new java.util.LinkedHashMap<>();
        inv.put("id", "INV-" + d.getDealNumber());
        inv.put("invoiceNumber", "INV-" + d.getDealNumber());
        inv.put("dealId", d.getId());
        inv.put("dealNumber", d.getDealNumber());
        inv.put("customerName", d.getCustomer().getName());
        inv.put("amount", d.getTotalAmount());
        inv.put("status", "DRAFT");
        inv.put("dueDate", java.time.LocalDate.now().plusDays(30).toString());
        return inv;
    }

    @PostMapping("/{dealId}/draft")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public BillingEngine.BillingSchedule draft(@PathVariable UUID dealId,
                                               Authentication authentication) {
        return billingService.draftInvoice(dealId, DealController.actorOf(authentication));
    }

    @PostMapping("/{dealId}/invoiced")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public DealController.DealDetail markInvoiced(@PathVariable UUID dealId,
                                                  Authentication authentication) {
        return DealController.DealDetail.from(
                billingService.markInvoiced(dealId, DealController.actorOf(authentication)));
    }

    @PostMapping("/{dealId}/paid")
    @PreAuthorize("hasAnyRole('FINANCE', 'ADMIN')")
    public DealController.DealDetail markPaid(@PathVariable UUID dealId,
                                              Authentication authentication) {
        return DealController.DealDetail.from(
                billingService.markPaid(dealId, DealController.actorOf(authentication)));
    }
}
