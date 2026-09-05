package com.dice.repository;

import com.dice.domain.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    Optional<Inventory> findByWarehouseIdAndProductId(UUID warehouseId, UUID productId);

    /** InventoryController.stockByProduct needs inv.getWarehouse() rendered
     *  after this transaction closes — fetch it eagerly rather than lazily. */
    @EntityGraph(attributePaths = {"warehouse"})
    List<Inventory> findByProductId(UUID productId);

    /**
     * Row-level lock for the reserve/release/fulfil critical section — two
     * concurrent allocations for the same warehouse/product must serialise
     * here rather than both reading stale availability.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Inventory i where i.warehouse.id = :warehouseId and i.product.id = :productId")
    Optional<Inventory> lockByWarehouseIdAndProductId(UUID warehouseId, UUID productId);
}
