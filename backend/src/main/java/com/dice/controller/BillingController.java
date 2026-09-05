package com.dice.controller;

import com.dice.engine.billing.BillingEngine;
import com.dice.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @GetMapping("/{dealId}/schedule")
    public BillingEngine.BillingSchedule schedule(@PathVariable UUID dealId) {
        return billingService.preview(dealId);
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
