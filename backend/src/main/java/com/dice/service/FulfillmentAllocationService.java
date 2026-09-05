package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.FulfillmentAllocationLine;
import com.dice.domain.FulfillmentPlan;
import com.dice.domain.Warehouse;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.FulfillmentStatus;
import com.dice.engine.allocation.AllocationEngine;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.repository.FulfillmentPlanRepository;
import com.dice.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Turns a confirmed sales order (a {@link Deal} in {@link DealStatus#CONFIRMED})
 * into a persisted {@link FulfillmentPlan}: ranks warehouses, reserves
 * authoritative stock via {@link InventoryService} (never trusting a
 * frontend-supplied quantity), and backorders whatever no warehouse can cover.
 *
 * <p>Distinct from the legacy {@link FulfillmentService}, which previews a
 * single warehouse per line off {@code Product.stockOnHand} and does not
 * persist a plan. This service is additive — it does not change that path.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FulfillmentAllocationService {

    private final DealRepository dealRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryService inventoryService;
    private final AllocationEngine allocationEngine;
    private final FulfillmentPlanRepository fulfillmentPlanRepository;
    private final AuditService auditService;
    private final EventPublisher eventPublisher;

    /** One manual override entry: how much of one deal line to force into one warehouse. */
    public record Override(UUID dealLineId, String warehouseCode, int quantity) {
    }

    /** Automatic allocation: ranks warehouses per line and greedily fills them. */
    public FulfillmentPlan allocate(UUID dealId, String actor) {
        Deal deal = requireConfirmedDeal(dealId);
        List<Warehouse> warehouses = warehouseRepository.findByActiveTrueOrderByDispatchDaysAsc();

        FulfillmentPlan plan = FulfillmentPlan.builder().deal(deal).createdBy(actor).build();

        for (DealLine line : deal.getLines()) {
            allocateLine(plan, line, warehouses);
        }

        return persistAndAudit(plan, actor);
    }

    private void allocateLine(FulfillmentPlan plan, DealLine line, List<Warehouse> warehouses) {
        int required = line.getQuantity();

        List<AllocationEngine.Candidate> candidates = warehouses.stream()
                .map(w -> new AllocationEngine.Candidate(
                        w, inventoryService.availableQuantity(w.getId(), line.getProduct().getId())))
                .filter(c -> c.availableQty() > 0)
                .toList();

        List<AllocationEngine.RankedAllocation> allocations =
                allocationEngine.allocate(allocationEngine.rank(candidates), required);

        int remaining = required;
        for (AllocationEngine.RankedAllocation allocation : allocations) {
            // Authoritative reservation — re-validated against live stock under lock,
            // not the snapshot used for ranking, so a concurrent allocation cannot oversell.
            inventoryService.reserve(allocation.warehouse().getId(), line.getProduct().getId(), allocation.allocatedQty());
            plan.addLine(FulfillmentAllocationLine.builder()
                    .dealLine(line)
                    .product(line.getProduct())
                    .warehouse(allocation.warehouse())
                    .quantity(allocation.allocatedQty())
                    .status(allocation.allocatedQty() == required
                            ? FulfillmentStatus.ALLOCATED : FulfillmentStatus.PARTIALLY_ALLOCATED)
                    .build());
            remaining -= allocation.allocatedQty();
        }

        if (remaining > 0) {
            plan.addLine(FulfillmentAllocationLine.builder()
                    .dealLine(line)
                    .product(line.getProduct())
                    .warehouse(null)
                    .quantity(remaining)
                    .status(FulfillmentStatus.BACKORDERED)
                    .build());
        }

        line.setFulfillmentStatus(remaining == 0
                ? FulfillmentStatus.ALLOCATED
                : (remaining == required ? FulfillmentStatus.BACKORDERED : FulfillmentStatus.PARTIALLY_ALLOCATED));
    }

    /**
     * Manual allocation override. Every entry is revalidated against live
     * inventory before anything is reserved — a caller cannot force more
     * units into a warehouse than it actually has, and cannot allocate more
     * than the line requires.
     */
    public FulfillmentPlan allocateWithOverrides(UUID dealId, List<Override> overrides, String actor) {
        Deal deal = requireConfirmedDeal(dealId);
        FulfillmentPlan plan = FulfillmentPlan.builder().deal(deal).createdBy(actor).build();

        Map<UUID, Integer> allocatedPerLine = new java.util.HashMap<>();

        for (Override override : overrides) {
            if (override.quantity() <= 0) {
                throw new IllegalArgumentException("Override quantity must be positive");
            }
            DealLine line = deal.getLines().stream()
                    .filter(l -> l.getId().equals(override.dealLineId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Line " + override.dealLineId() + " does not belong to deal " + dealId));

            Warehouse warehouse = warehouseRepository.findByCode(override.warehouseCode())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "No warehouse with code " + override.warehouseCode()));

            int alreadyAllocated = allocatedPerLine.getOrDefault(line.getId(), 0);
            if (alreadyAllocated + override.quantity() > line.getQuantity()) {
                throw new IllegalArgumentException(
                        "Override allocates %d units of line %s but only %d are required"
                                .formatted(alreadyAllocated + override.quantity(), line.getId(), line.getQuantity()));
            }

            int available = inventoryService.availableQuantity(warehouse.getId(), line.getProduct().getId());
            if (override.quantity() > available) {
                throw new IllegalArgumentException(
                        "Warehouse %s only has %d units of %s available; cannot allocate %d"
                                .formatted(warehouse.getCode(), available, line.getProduct().getSku(), override.quantity()));
            }

            inventoryService.reserve(warehouse.getId(), line.getProduct().getId(), override.quantity());
            allocatedPerLine.merge(line.getId(), override.quantity(), Integer::sum);

            plan.addLine(FulfillmentAllocationLine.builder()
                    .dealLine(line)
                    .product(line.getProduct())
                    .warehouse(warehouse)
                    .quantity(override.quantity())
                    .status(allocatedPerLine.get(line.getId()).equals(line.getQuantity())
                            ? FulfillmentStatus.ALLOCATED : FulfillmentStatus.PARTIALLY_ALLOCATED)
                    .build());
        }

        for (DealLine line : deal.getLines()) {
            int allocated = allocatedPerLine.getOrDefault(line.getId(), 0);
            int remaining = line.getQuantity() - allocated;
            if (remaining > 0) {
                plan.addLine(FulfillmentAllocationLine.builder()
                        .dealLine(line)
                        .product(line.getProduct())
                        .warehouse(null)
                        .quantity(remaining)
                        .status(FulfillmentStatus.BACKORDERED)
                        .build());
            }
            line.setFulfillmentStatus(remaining == 0
                    ? FulfillmentStatus.ALLOCATED
                    : (allocated > 0 ? FulfillmentStatus.PARTIALLY_ALLOCATED : FulfillmentStatus.BACKORDERED));
        }

        return persistAndAudit(plan, actor);
    }

    private FulfillmentPlan persistAndAudit(FulfillmentPlan plan, String actor) {
        FulfillmentPlan saved = fulfillmentPlanRepository.save(plan);
        dealRepository.save(plan.getDeal());

        long backorderedLines = saved.getLines().stream()
                .filter(l -> l.getStatus() == FulfillmentStatus.BACKORDERED)
                .count();

        auditService.record(AuditService.FULFILLMENT, saved.getDeal().getId(),
                AuditService.FULFILLMENT_ALLOCATED, actor,
                null, saved.getId().toString(),
                "Allocated %d line(s), %d backordered".formatted(saved.getLines().size(), backorderedLines));

        eventPublisher.publish(DealEvent.Type.FULFILLMENT_PLANNED, saved.getDeal().getId(), actor,
                Map.of("planId", saved.getId(), "backorderedLines", backorderedLines));

        return saved;
    }

    @Transactional(readOnly = true)
    public List<FulfillmentPlan> plansFor(UUID dealId) {
        return fulfillmentPlanRepository.findByDealIdOrderByCreatedAtDesc(dealId);
    }

    private Deal requireConfirmedDeal(UUID dealId) {
        Deal deal = dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));
        if (deal.getStatus() != DealStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Deal %s must be CONFIRMED before fulfillment allocation (currently %s)"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }
        return deal;
    }
}
