package com.dice.controller;

import com.dice.engine.fulfillment.FulfillmentEngine;
import com.dice.service.FulfillmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/fulfillment")
@RequiredArgsConstructor
public class FulfillmentController {

    private final FulfillmentService fulfillmentService;

    /** What the plan would look like; changes nothing. */
    @GetMapping("/{dealId}/plan")
    public FulfillmentEngine.FulfillmentPlan plan(@PathVariable UUID dealId) {
        return fulfillmentService.preview(dealId);
    }

    @PostMapping("/{dealId}/commit")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public FulfillmentEngine.FulfillmentPlan commit(@PathVariable UUID dealId,
                                                    Authentication authentication) {
        return fulfillmentService.commit(dealId, DealController.actorOf(authentication));
    }

    @PostMapping("/{dealId}/ship")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public DealController.DealDetail ship(@PathVariable UUID dealId,
                                          Authentication authentication) {
        return DealController.DealDetail.from(
                fulfillmentService.markShipped(dealId, DealController.actorOf(authentication)));
    }
}
