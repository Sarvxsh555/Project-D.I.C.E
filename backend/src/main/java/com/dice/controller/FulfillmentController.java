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

    /** Automatic multi-warehouse allocation for a confirmed sales order. */
    @PostMapping("/{dealId}/allocate")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public FulfillmentPlanView allocate(@PathVariable UUID dealId, Authentication authentication) {
        return FulfillmentPlanView.from(
                fulfillmentAllocationService.allocate(dealId, DealController.actorOf(authentication)));
    }

    /** Manual allocation, revalidated server-side against live inventory before anything reserves. */
    @PostMapping("/{dealId}/allocate/override")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public FulfillmentPlanView allocateWithOverrides(@PathVariable UUID dealId,
                                                     @Valid @RequestBody OverrideAllocationRequest request,
                                                     Authentication authentication) {
        List<FulfillmentAllocationService.Override> overrides = request.overrides().stream()
                .map(o -> new FulfillmentAllocationService.Override(o.dealLineId(), o.warehouseCode(), o.quantity()))
                .toList();
        return FulfillmentPlanView.from(
                fulfillmentAllocationService.allocateWithOverrides(
                        dealId, overrides, DealController.actorOf(authentication)));
    }

    @GetMapping("/{dealId}/plans")
    @PreAuthorize("hasAnyRole('OPERATIONS', 'ADMIN')")
    public List<FulfillmentPlanView> plans(@PathVariable UUID dealId) {
        return fulfillmentAllocationService.plansFor(dealId).stream().map(FulfillmentPlanView::from).toList();
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
