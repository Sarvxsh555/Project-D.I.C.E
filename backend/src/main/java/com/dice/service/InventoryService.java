package com.dice.service;

import com.dice.domain.Inventory;
import com.dice.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Owns per-warehouse stock. This is the only place {@code availableQty},
 * {@code reservedQty} and {@code fulfilledQty} move — callers never write to
 * an {@link Inventory} row directly.
 *
 * <p>Every mutation locks the row with {@code PESSIMISTIC_WRITE} inside the
 * caller's transaction before reading a quantity, so two concurrent
 * reservations for the same warehouse/product serialise rather than both
 * computing availability from a stale read. The {@link Inventory#getVersion()}
 * optimistic counter is a second line of defence if the isolation level ever
 * changes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    @Transactional(readOnly = true)
    public Optional<Inventory> find(UUID warehouseId, UUID productId) {
        return inventoryRepository.findByWarehouseIdAndProductId(warehouseId, productId);
    }

    @Transactional(readOnly = true)
    public List<Inventory> byProduct(UUID productId) {
        return inventoryRepository.findByProductId(productId);
    }

    @Transactional(readOnly = true)
    public int availableQuantity(UUID warehouseId, UUID productId) {
        return inventoryRepository.findByWarehouseIdAndProductId(warehouseId, productId)
                .map(Inventory::getAvailableQty)
                .orElse(0);
    }

    /**
     * Moves {@code quantity} units from available to reserved, atomically.
     * Never allowed to exceed what is actually on hand.
     */
    public Inventory reserve(UUID warehouseId, UUID productId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Reservation quantity must be positive");
        }
        Inventory inventory = lock(warehouseId, productId);
        if (inventory.getAvailableQty() < quantity) {
            throw new IllegalStateException(
                    "Cannot reserve %d units of product %s at warehouse %s; only %d available"
                            .formatted(quantity, productId, warehouseId, inventory.getAvailableQty()));
        }
        inventory.setAvailableQty(inventory.getAvailableQty() - quantity);
        inventory.setReservedQty(inventory.getReservedQty() + quantity);
        return inventoryRepository.save(inventory);
    }

    /** Undoes a reservation that will not be fulfilled (e.g. order cancelled). */
    public Inventory release(UUID warehouseId, UUID productId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Release quantity must be positive");
        }
        Inventory inventory = lock(warehouseId, productId);
        int toRelease = Math.min(quantity, inventory.getReservedQty());
        inventory.setReservedQty(inventory.getReservedQty() - toRelease);
        inventory.setAvailableQty(inventory.getAvailableQty() + toRelease);
        return inventoryRepository.save(inventory);
    }

    /** Converts a reservation into a completed shipment. */
    public Inventory fulfill(UUID warehouseId, UUID productId, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Fulfilled quantity must be positive");
        }
        Inventory inventory = lock(warehouseId, productId);
        if (inventory.getReservedQty() < quantity) {
            throw new IllegalStateException(
                    "Cannot fulfil %d units of product %s at warehouse %s; only %d reserved"
                            .formatted(quantity, productId, warehouseId, inventory.getReservedQty()));
        }
        inventory.setReservedQty(inventory.getReservedQty() - quantity);
        inventory.setFulfilledQty(inventory.getFulfilledQty() + quantity);
        return inventoryRepository.save(inventory);
    }

    private Inventory lock(UUID warehouseId, UUID productId) {
        return inventoryRepository.lockByWarehouseIdAndProductId(warehouseId, productId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No inventory row for warehouse %s / product %s".formatted(warehouseId, productId)));
    }
}
