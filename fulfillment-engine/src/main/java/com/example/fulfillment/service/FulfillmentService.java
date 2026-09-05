package com.example.fulfillment.service;

import com.example.fulfillment.client.*;
import com.example.fulfillment.model.FulfillmentAllocationLine;
import com.example.fulfillment.model.FulfillmentPlan;
import com.example.fulfillment.repository.FulfillmentPlanRepository;
import com.example.fulfillment.web.OverrideRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional
public class FulfillmentService {

    private static final double RATE_PER_KG = 50.0;

    private final FulfillmentPlanRepository plans;
    private final ExternalServicesClient client;

    public FulfillmentService(FulfillmentPlanRepository plans, ExternalServicesClient client) {
        this.plans = plans;
        this.client = client;
    }

    /** Proposes a warehouse split without reserving anything yet - a preview the caller can accept or override. */
    public FulfillmentPlan proposePlan(Long orderId, String bearerToken) {
        OrderDto order = client.fetchOrder(orderId, bearerToken);

        FulfillmentPlan plan = plans.findByOrderId(orderId).orElseGet(FulfillmentPlan::new);
        plan.setOrderId(orderId);
        plan.setStatus("PROPOSED");
        plan.getLines().clear();

        for (OrderDto.Line line : order.lines) {
            allocateLines(plan, line.productId, line.productName, (int) Math.round(line.quantity), bearerToken);
        }
        recomputeTotals(plan);
        return plans.save(plan);
    }

    /** Accept Suggested Split: actually commits reservations against live stock. Re-derives
     *  the plan's lines from what inventory-engine actually grants, since stock may have moved
     *  since the proposal was shown. */
    public FulfillmentPlan acceptPlan(Long planId, String bearerToken) {
        FulfillmentPlan plan = getOrThrow(planId);
        requireProposed(plan);

        Map<Long, int[]> requestedByProduct = new LinkedHashMap<>(); // productId -> [quantity]
        Map<Long, String> namesByProduct = new HashMap<>();
        for (FulfillmentAllocationLine line : plan.getLines()) {
            requestedByProduct.merge(line.getProductId(), new int[]{line.getQuantity()}, (a, b) -> new int[]{a[0] + b[0]});
            namesByProduct.put(line.getProductId(), line.getProductName());
        }

        plan.getLines().clear();
        String orderRef = "ORDER-" + plan.getOrderId();
        for (var entry : requestedByProduct.entrySet()) {
            Long productId = entry.getKey();
            Map<Long, String> warehouseNames = warehouseNameLookup(productId, bearerToken);
            ReservationResultDto result = client.reserveStock(orderRef, productId, entry.getValue()[0], bearerToken);
            for (ReservationResultDto.Reservation r : result.reservations) {
                addLine(plan, productId, namesByProduct.get(productId), r.warehouseId,
                        warehouseNames.get(r.warehouseId), r.quantity, false, productId, bearerToken);
            }
            if (result.backorder != null) {
                addBackorderLine(plan, productId, namesByProduct.get(productId), result.backorder.quantity);
            }
        }

        plan.setStatus("CONFIRMED");
        recomputeTotals(plan);
        return plans.save(plan);
    }

    /**
     * Manual Override: replaces the plan with exactly what the caller specified, but every
     * line still has to clear inventory-engine's atomic stock check - this is the backend
     * validation the override must go through, not a client-side assumption.
     */
    public FulfillmentPlan overridePlan(Long planId, OverrideRequest request, String bearerToken) {
        FulfillmentPlan plan = getOrThrow(planId);
        requireProposed(plan);

        // Pre-flight: check every line against current availability before committing any of
        // them, so an invalid override fails as a whole rather than partially applying.
        for (OverrideRequest.OverrideLine line : request.getLines()) {
            StockCheckDto stock = client.checkStock(line.getProductId(), bearerToken);
            int availableAtWarehouse = stock.byWarehouse.stream()
                    .filter(w -> w.warehouseId.equals(line.getWarehouseId()))
                    .findFirst()
                    .map(w -> w.available)
                    .orElse(0);
            if (line.getQuantity() > availableAtWarehouse) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Override rejected: warehouse " + line.getWarehouseId() + " only has " + availableAtWarehouse
                                + " available for product " + line.getProductId() + ", requested " + line.getQuantity());
            }
        }

        plan.getLines().clear();
        String orderRef = "ORDER-" + plan.getOrderId();
        for (OverrideRequest.OverrideLine line : request.getLines()) {
            ProductDto product = client.fetchProduct(line.getProductId(), bearerToken);
            Map<Long, String> warehouseNames = warehouseNameLookup(line.getProductId(), bearerToken);
            // Still atomic and still validated server-side, even though we just pre-checked -
            // the pre-flight check and this commit are not the same instant.
            client.reserveExact(orderRef, line.getWarehouseId(), line.getProductId(), line.getQuantity(), bearerToken);
            addLine(plan, line.getProductId(), product.name, line.getWarehouseId(),
                    warehouseNames.get(line.getWarehouseId()), line.getQuantity(), false, line.getProductId(), bearerToken);
        }

        plan.setStatus("CONFIRMED");
        recomputeTotals(plan);
        return plans.save(plan);
    }

    public FulfillmentPlan getOrThrow(Long id) {
        return plans.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fulfillment plan not found"));
    }

    public FulfillmentPlan getByOrder(Long orderId) {
        return plans.findByOrderId(orderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No fulfillment plan for this order"));
    }

    private void allocateLines(FulfillmentPlan plan, Long productId, String productName, int quantity, String bearerToken) {
        StockCheckDto stock = client.checkStock(productId, bearerToken);
        List<StockCheckDto.Line> byAvailability = stock.byWarehouse.stream()
                .sorted(Comparator.comparingInt((StockCheckDto.Line w) -> w.available).reversed())
                .toList();

        int remaining = quantity;
        for (StockCheckDto.Line w : byAvailability) {
            if (remaining <= 0) break;
            int take = Math.min(remaining, w.available);
            if (take <= 0) continue;
            addLine(plan, productId, productName, w.warehouseId, w.warehouseName, take, false, productId, bearerToken);
            remaining -= take;
        }
        if (remaining > 0) {
            addBackorderLine(plan, productId, productName, remaining);
        }
    }

    private void addLine(FulfillmentPlan plan, Long productId, String productName, Long warehouseId, String warehouseName,
                          int quantity, boolean backordered, Long productIdForWeight, String bearerToken) {
        FulfillmentAllocationLine line = new FulfillmentAllocationLine();
        line.setPlan(plan);
        line.setProductId(productId);
        line.setProductName(productName);
        line.setWarehouseId(warehouseId);
        line.setWarehouseName(warehouseName);
        line.setQuantity(quantity);
        line.setBackordered(backordered);
        line.setShippingCost(round(quantity * weightPerUnitKg(productIdForWeight, bearerToken) * RATE_PER_KG));
        plan.getLines().add(line);
    }

    private void addBackorderLine(FulfillmentPlan plan, Long productId, String productName, int quantity) {
        FulfillmentAllocationLine line = new FulfillmentAllocationLine();
        line.setPlan(plan);
        line.setProductId(productId);
        line.setProductName(productName);
        line.setWarehouseId(null);
        line.setWarehouseName(null);
        line.setQuantity(quantity);
        line.setBackordered(true);
        line.setShippingCost(0);
        plan.getLines().add(line);
    }

    private double weightPerUnitKg(Long productId, String bearerToken) {
        String category = client.fetchProduct(productId, bearerToken).category;
        if (category == null) return 1.0;
        return switch (category) {
            case "Electronics" -> 2.5;
            case "Services" -> 0.0;
            case "Sporting Goods" -> 1.5;
            default -> 1.0;
        };
    }

    private Map<Long, String> warehouseNameLookup(Long productId, String bearerToken) {
        StockCheckDto stock = client.checkStock(productId, bearerToken);
        Map<Long, String> names = new HashMap<>();
        for (StockCheckDto.Line w : stock.byWarehouse) {
            names.put(w.warehouseId, w.warehouseName);
        }
        return names;
    }

    private void recomputeTotals(FulfillmentPlan plan) {
        Set<Long> warehousesUsed = new HashSet<>();
        double totalCost = 0;
        for (FulfillmentAllocationLine line : plan.getLines()) {
            if (!line.isBackordered() && line.getWarehouseId() != null) {
                warehousesUsed.add(line.getWarehouseId());
            }
            totalCost += line.getShippingCost();
        }
        plan.setShipmentCount(warehousesUsed.size());
        plan.setTotalShippingCost(round(totalCost));
    }

    private void requireProposed(FulfillmentPlan plan) {
        if (!"PROPOSED".equals(plan.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Plan is " + plan.getStatus() + ", not PROPOSED");
        }
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
