package com.dice.controller;

import com.dice.domain.FulfillmentAllocationLine;
import com.dice.domain.FulfillmentPlan;
import com.dice.engine.fulfillment.FulfillmentEngine;
import com.dice.service.FulfillmentAllocationService;
import com.dice.service.FulfillmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/fulfillment")
@RequiredArgsConstructor
public class FulfillmentController {

    private final FulfillmentService fulfillmentService;
    private final FulfillmentAllocationService fulfillmentAllocationService;
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

    /** What the plan would look like; changes nothing. */
    @GetMapping({"/{dealId}", "/{dealId}/plan"})
    public FulfillmentEngine.FulfillmentPlan plan(@PathVariable String dealId) {
        com.dice.domain.Deal deal = resolveDeal(dealId);
        return fulfillmentService.preview(deal.getId());
    }

    @PostMapping("/{dealId}/commit")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public FulfillmentEngine.FulfillmentPlan commit(@PathVariable String dealId,
                                                    Authentication authentication) {
        com.dice.domain.Deal deal = resolveDeal(dealId);
        return fulfillmentService.commit(deal.getId(), DealController.actorOf(authentication));
    }

    @PostMapping("/{dealId}/ship")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public DealController.DealDetail ship(@PathVariable String dealId,
                                          Authentication authentication) {
        com.dice.domain.Deal deal = resolveDeal(dealId);
        return DealController.DealDetail.from(
                fulfillmentService.markShipped(deal.getId(), DealController.actorOf(authentication)));
    }

    /** Automatic multi-warehouse allocation for a confirmed sales order. */
    @PostMapping("/{dealId}/allocate")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public FulfillmentPlanView allocate(@PathVariable String dealId, Authentication authentication) {
        com.dice.domain.Deal deal = resolveDeal(dealId);
        return FulfillmentPlanView.from(
                fulfillmentAllocationService.allocate(deal.getId(), DealController.actorOf(authentication)));
    }

    /** Manual allocation, revalidated server-side against live inventory before anything reserves. */
    @PostMapping("/{dealId}/allocate/override")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public FulfillmentPlanView allocateWithOverrides(@PathVariable String dealId,
                                                     @Valid @RequestBody OverrideAllocationRequest request,
                                                     Authentication authentication) {
        com.dice.domain.Deal deal = resolveDeal(dealId);
        List<FulfillmentAllocationService.Override> overrides = request.overrides().stream()
                .map(o -> new FulfillmentAllocationService.Override(o.dealLineId(), o.warehouseCode(), o.quantity()))
                .toList();
        return FulfillmentPlanView.from(
                fulfillmentAllocationService.allocateWithOverrides(
                        deal.getId(), overrides, DealController.actorOf(authentication)));
    }

    @GetMapping("/{dealId}/plans")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public List<FulfillmentPlanView> plans(@PathVariable String dealId) {
        com.dice.domain.Deal deal = resolveDeal(dealId);
        return fulfillmentAllocationService.plansFor(deal.getId()).stream().map(FulfillmentPlanView::from).toList();
    }

    public record OverrideAllocationRequest(@NotEmpty List<OverrideEntry> overrides) {
    }

    public record OverrideEntry(@NotNull UUID dealLineId, @NotNull String warehouseCode, @Positive int quantity) {
    }

    public record FulfillmentPlanView(UUID id, UUID dealId, String createdBy, Instant createdAt,
                                      List<AllocationLineView> lines) {
        static FulfillmentPlanView from(FulfillmentPlan plan) {
            return new FulfillmentPlanView(plan.getId(), plan.getDeal().getId(), plan.getCreatedBy(),
                    plan.getCreatedAt(), plan.getLines().stream().map(AllocationLineView::from).toList());
        }
    }

    public record AllocationLineView(UUID dealLineId, String sku, String warehouseCode,
                                     int quantity, String status) {
        static AllocationLineView from(FulfillmentAllocationLine line) {
            return new AllocationLineView(line.getDealLine().getId(), line.getProduct().getSku(),
                    line.getWarehouse() == null ? null : line.getWarehouse().getCode(),
                    line.getQuantity(), line.getStatus().name());
        }
    }
}
