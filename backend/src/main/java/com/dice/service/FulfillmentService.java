package com.dice.service;

import com.dice.domain.Deal;
import com.dice.domain.enums.DealStatus;
import com.dice.domain.enums.FulfillmentStatus;
import com.dice.engine.fulfillment.FulfillmentEngine;
import com.dice.events.DealEvent;
import com.dice.events.EventPublisher;
import com.dice.repository.DealRepository;
import com.dice.repository.ProductRepository;
import com.dice.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Turns an approved deal into a shipping plan, and reacts when stock moves
 * underneath one.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FulfillmentService {

    private final DealRepository dealRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final FulfillmentEngine fulfillmentEngine;
    private final EventPublisher eventPublisher;

    /** Read-only view of what would happen; does not touch the deal. */
    @Transactional(readOnly = true)
    public FulfillmentEngine.FulfillmentPlan preview(UUID dealId) {
        return fulfillmentEngine.plan(requireDeal(dealId),
                warehouseRepository.findByActiveTrueOrderByDispatchDaysAsc());
    }

    /**
     * Commits the plan: writes the chosen warehouse and status onto each line and
     * moves the deal into FULFILLING.
     */
    public FulfillmentEngine.FulfillmentPlan commit(UUID dealId, String actor) {
        Deal deal = requireDeal(dealId);
        if (deal.getStatus() != DealStatus.APPROVED && deal.getStatus() != DealStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Deal %s must be approved before fulfillment (currently %s)"
                            .formatted(deal.getDealNumber(), deal.getStatus()));
        }

        var warehouses = warehouseRepository.findByActiveTrueOrderByDispatchDaysAsc();
        var plan = fulfillmentEngine.plan(deal, warehouses);

        var byLineId = plan.allocations().stream()
                .collect(java.util.stream.Collectors.toMap(
                        FulfillmentEngine.Allocation::lineId, a -> a));

        deal.getLines().forEach(line -> {
            var allocation = byLineId.get(line.getId());
            if (allocation == null) {
                return;
            }
            line.setFulfillmentStatus(allocation.status());
            warehouseRepository.findByCode(
                    allocation.warehouseCode() == null ? "" : allocation.warehouseCode())
                    .ifPresent(line::setWarehouse);
        });

        deal.setStatus(DealStatus.FULFILLING);
        dealRepository.save(deal);

        eventPublisher.publish(DealEvent.Type.FULFILLMENT_PLANNED, dealId, actor,
                Map.of("promisedShipDate", plan.promisedShipDate().toString(),
                        "fullyAllocated", plan.fullyAllocated()));

        return plan;
    }

    /**
     * Applies an inventory movement from Odoo. Returns true when a deal in flight
     * is affected and should be re-planned — the caller decides whether to
     * re-evaluate, so this stays free of circular service calls.
     */
    public boolean applyInventoryChange(Long odooProductId, int newStockOnHand, String actor) {
        var product = productRepository.findByOdooProductId(odooProductId).orElse(null);
        if (product == null) {
            log.debug("Inventory event for unknown Odoo product {}", odooProductId);
            return false;
        }

        int previous = product.getStockOnHand() == null ? 0 : product.getStockOnHand();
        product.setStockOnHand(newStockOnHand);
        productRepository.save(product);

        log.info("Stock for {} moved {} -> {}", product.getSku(), previous, newStockOnHand);
        return newStockOnHand < previous;
    }

    /** Marks every allocated line as shipped. */
    public Deal markShipped(UUID dealId, String actor) {
        Deal deal = requireDeal(dealId);
        deal.getLines().stream()
                .filter(line -> line.getFulfillmentStatus() == FulfillmentStatus.ALLOCATED)
                .forEach(line -> line.setFulfillmentStatus(FulfillmentStatus.SHIPPED));

        boolean allShipped = deal.getLines().stream()
                .allMatch(line -> line.getFulfillmentStatus() == FulfillmentStatus.SHIPPED);
        if (allShipped) {
            deal.setStatus(DealStatus.FULFILLED);
        }
        return dealRepository.save(deal);
    }

    private Deal requireDeal(UUID dealId) {
        return dealRepository.findWithLinesById(dealId)
                .orElseThrow(() -> new IllegalArgumentException("No deal with id " + dealId));
    }
}
