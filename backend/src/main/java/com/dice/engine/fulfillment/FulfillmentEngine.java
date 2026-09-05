package com.dice.engine.fulfillment;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Warehouse;
import com.dice.domain.enums.FulfillmentStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Decides where each line ships from and when it can land.
 *
 * <p>Allocation is greedy: prefer a warehouse in the customer's region, then the
 * fastest dispatch. Stock is tracked on the product rather than per-warehouse in
 * this iteration, so a single source is chosen per line — splitting a line
 * across sites is the obvious next step.
 */
@Component
public class FulfillmentEngine {

    public FulfillmentPlan plan(Deal deal, List<Warehouse> warehouses) {
        List<Allocation> allocations = new ArrayList<>();
        String customerRegion = deal.getCustomer().getRegion();

        for (DealLine line : deal.getLines()) {
            allocations.add(allocate(line, warehouses, customerRegion));
        }

        LocalDate promised = allocations.stream()
                .map(Allocation::expectedShipDate)
                .max(Comparator.naturalOrder())
                .orElse(LocalDate.now());

        boolean complete = allocations.stream()
                .allMatch(a -> a.status() == FulfillmentStatus.ALLOCATED);

        return new FulfillmentPlan(List.copyOf(allocations), promised, complete,
                deal.getRequestedDeliveryDate() != null
                        && promised.isAfter(deal.getRequestedDeliveryDate()));
    }

    private Allocation allocate(DealLine line, List<Warehouse> warehouses, String customerRegion) {
        int available = line.getProduct().getStockOnHand() == null
                ? 0 : line.getProduct().getStockOnHand();
        int required = line.getQuantity();

        Warehouse source = warehouses.stream()
                .filter(Warehouse::isActive)
                .min(Comparator
                        // In-region first...
                        .comparing((Warehouse w) -> java.util.Objects.equals(w.getRegion(), customerRegion) ? 0 : 1)
                        // ...then whichever gets it out the door soonest.
                        .thenComparingInt(w -> w.getDispatchDays() == null ? Integer.MAX_VALUE : w.getDispatchDays()))
                .orElse(null);

        if (source == null) {
            return new Allocation(line.getId(), line.getProduct().getSku(), required, 0,
                    null, FulfillmentStatus.BACKORDERED,
                    LocalDate.now().plusDays(leadTime(line)),
                    "No active warehouse available");
        }

        int allocated = Math.min(available, required);
        FulfillmentStatus status;
        String note;
        if (allocated == required) {
            status = FulfillmentStatus.ALLOCATED;
            note = "Fully allocated from %s".formatted(source.getCode());
        } else if (allocated > 0) {
            status = FulfillmentStatus.PARTIALLY_ALLOCATED;
            note = "%d of %d units available at %s; remainder backordered"
                    .formatted(allocated, required, source.getCode());
        } else {
            status = FulfillmentStatus.BACKORDERED;
            note = "No stock on hand; %d day lead time applies".formatted(leadTime(line));
        }

        int days = source.getDispatchDays() == null ? 1 : source.getDispatchDays();
        if (status != FulfillmentStatus.ALLOCATED) {
            days += leadTime(line);
        }

        return new Allocation(line.getId(), line.getProduct().getSku(), required, allocated,
                source.getCode(), status, LocalDate.now().plusDays(days), note);
    }

    private int leadTime(DealLine line) {
        Integer lead = line.getProduct().getLeadTimeDays();
        return lead == null ? 0 : lead;
    }

    /**
     * @param promisedShipDate the latest line date — the deal is only as fast as
     *                         its slowest allocation
     * @param missesRequestedDate true when the plan lands after the customer's
     *                            requested delivery date
     */
    public record FulfillmentPlan(
            List<Allocation> allocations,
            LocalDate promisedShipDate,
            boolean fullyAllocated,
            boolean missesRequestedDate) {

        public List<Allocation> shortfalls() {
            return allocations.stream()
                    .filter(a -> a.status() != FulfillmentStatus.ALLOCATED)
                    .toList();
        }
    }

    public record Allocation(
            java.util.UUID lineId,
            String sku,
            int requiredQuantity,
            int allocatedQuantity,
            String warehouseCode,
            FulfillmentStatus status,
            LocalDate expectedShipDate,
            String note) {
    }
}
