package com.example.inventory.service;

import com.example.inventory.model.*;
import com.example.inventory.repository.*;
import com.example.inventory.web.ReservationResult;
import com.example.inventory.web.StockCheckResponse;
import com.example.inventory.web.StockLine;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional
public class InventoryService {

    private final InventoryRepository inventory;
    private final WarehouseRepository warehouses;
    private final InventoryReservationRepository reservations;
    private final WarehouseAllocationRepository allocations;
    private final BackorderRepository backorders;

    public InventoryService(InventoryRepository inventory, WarehouseRepository warehouses,
                             InventoryReservationRepository reservations, WarehouseAllocationRepository allocations,
                             BackorderRepository backorders) {
        this.inventory = inventory;
        this.warehouses = warehouses;
        this.reservations = reservations;
        this.allocations = allocations;
        this.backorders = backorders;
    }

    @Transactional(readOnly = true)
    public StockCheckResponse checkStock(Long productId) {
        List<Inventory> rows = inventory.findByProductIdOrderByWarehouseIdAsc(productId);
        List<StockLine> lines = new ArrayList<>();
        int total = 0;
        for (Inventory row : rows) {
            String name = warehouses.findById(row.getWarehouseId()).map(Warehouse::getName).orElse("Unknown");
            lines.add(new StockLine(row.getWarehouseId(), name, row.getQuantityOnHand(), row.getQuantityReserved()));
            total += row.getAvailable();
        }
        return new StockCheckResponse(productId, total, lines);
    }

    /**
     * Reserves stock for an order, greedily across warehouses (largest available first),
     * locking each warehouse's stock row before reading or writing it so two concurrent
     * reservations for the same product can never both succeed against the same units.
     * Any shortfall becomes a backorder rather than silently under-reserving.
     */
    public ReservationResult reserveStock(String orderRef, Long productId, int quantity) {
        List<Inventory> rows = inventory.findByProductIdOrderByWarehouseIdAsc(productId);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No inventory configured for product " + productId);
        }

        // Try the warehouse with the most available stock first, to minimise fragmentation
        // across shipments. This is just a preference order - correctness under concurrency
        // comes from tryReserve's atomic conditional update, not from this ordering.
        List<Long> pickOrder = rows.stream()
                .sorted(Comparator.comparingInt(Inventory::getAvailable).reversed())
                .map(Inventory::getWarehouseId)
                .toList();

        int remaining = quantity;
        List<InventoryReservation> created = new ArrayList<>();
        for (Long warehouseId : pickOrder) {
            // Retry against this warehouse until either it's exhausted or we've taken enough -
            // each failed attempt means a concurrent caller won the race for those units, so
            // we re-read current availability and try again rather than giving up or overselling.
            while (remaining > 0) {
                Inventory current = inventory.findByWarehouseIdAndProductId(warehouseId, productId).orElseThrow();
                int take = Math.min(remaining, current.getAvailable());
                if (take <= 0) break;

                int updated = inventory.tryReserve(warehouseId, productId, take);
                if (updated == 0) {
                    continue; // lost the race for that stock - re-read and retry with fresh numbers
                }

                InventoryReservation reservation = new InventoryReservation();
                reservation.setOrderRef(orderRef);
                reservation.setProductId(productId);
                reservation.setWarehouseId(warehouseId);
                reservation.setQuantity(take);
                reservation.setStatus("ACTIVE");
                created.add(reservations.save(reservation));

                remaining -= take;
            }
            if (remaining <= 0) break;
        }

        Backorder backorder = null;
        if (remaining > 0) {
            backorder = createBackorder(orderRef, productId, remaining);
        }

        int reserved = quantity - remaining;
        return new ReservationResult(created, quantity, reserved, backorder);
    }

    public WarehouseAllocation allocateStock(Long reservationId) {
        InventoryReservation reservation = reservations.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (!"ACTIVE".equals(reservation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation is " + reservation.getStatus() + ", not ACTIVE");
        }

        reservation.setStatus("ALLOCATED");
        reservations.save(reservation);

        WarehouseAllocation allocation = new WarehouseAllocation();
        allocation.setReservationId(reservation.getId());
        allocation.setWarehouseId(reservation.getWarehouseId());
        allocation.setProductId(reservation.getProductId());
        allocation.setQuantity(reservation.getQuantity());
        return allocations.save(allocation);
    }

    public InventoryReservation releaseStock(Long reservationId) {
        InventoryReservation reservation = reservations.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (!"ACTIVE".equals(reservation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation is " + reservation.getStatus() + ", cannot release");
        }

        inventory.releaseReserved(reservation.getWarehouseId(), reservation.getProductId(), reservation.getQuantity());

        reservation.setStatus("RELEASED");
        return reservations.save(reservation);
    }

    public Backorder createBackorder(String orderRef, Long productId, int quantity) {
        Backorder backorder = new Backorder();
        backorder.setOrderRef(orderRef);
        backorder.setProductId(productId);
        backorder.setQuantity(quantity);
        backorder.setStatus("OPEN");
        return backorders.save(backorder);
    }

    /**
     * Call after restock: walks open backorders for a product oldest-first and reserves
     * against newly available stock until either the backorders or the stock runs out.
     */
    public List<InventoryReservation> consolidateBackorder(Long productId) {
        List<Backorder> open = backorders.findByProductIdAndStatusOrderByCreatedAtAsc(productId, "OPEN");
        List<InventoryReservation> newReservations = new ArrayList<>();

        for (Backorder backorder : open) {
            ReservationResult result = reserveStock(backorder.getOrderRef(), productId, backorder.getQuantity());
            newReservations.addAll(result.reservations);

            if (result.backorder == null) {
                backorder.setStatus("FULFILLED");
                backorders.save(backorder);
            } else {
                // Partially or not satisfied: shrink this backorder to the remaining amount
                // and stop - later, older-still backorders already got priority.
                backorder.setQuantity(result.backorder.getQuantity());
                backorders.save(backorder);
                backorders.delete(result.backorder); // fold the newly-created shortfall back into the original record
                break;
            }
        }
        return newReservations;
    }

    public List<InventoryReservation> getReservations(String orderRef) {
        return reservations.findByOrderRef(orderRef);
    }
}
