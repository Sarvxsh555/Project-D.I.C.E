package com.example.inventory.repository;

import com.example.inventory.model.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    List<Inventory> findByProductIdOrderByWarehouseIdAsc(Long productId);

    Optional<Inventory> findByWarehouseIdAndProductId(Long warehouseId, Long productId);

    /**
     * Atomic compare-and-swap: only increments quantityReserved if enough stock is still
     * available at the moment the UPDATE actually runs, checked and written in one statement.
     * Postgres guarantees this read-modify-write is atomic per row, so this is correct under
     * concurrency regardless of transaction isolation level or whether a separate SELECT ...
     * FOR UPDATE lock was actually held - two concurrent callers racing for the last units
     * cannot both succeed, and the loser's affected-row-count of 0 tells the caller to retry
     * against the now-current availability instead of silently overselling.
     */
    // clearAutomatically: without this, a plain find() later in the same transaction can
    // return the stale entity this bulk update just bypassed, instead of the fresh row -
    // which would make the retry loop in InventoryService spin forever on self-observed
    // stale data. Clearing forces every subsequent read in this transaction back to the DB.
    @Modifying(clearAutomatically = true)
    @Query("update Inventory i set i.quantityReserved = i.quantityReserved + :take " +
            "where i.warehouseId = :warehouseId and i.productId = :productId " +
            "and (i.quantityOnHand - i.quantityReserved) >= :take")
    int tryReserve(@Param("warehouseId") Long warehouseId, @Param("productId") Long productId, @Param("take") int take);

    @Modifying(clearAutomatically = true)
    @Query(value = "update inventory set quantity_reserved = greatest(0, quantity_reserved - :qty) " +
            "where warehouse_id = :warehouseId and product_id = :productId", nativeQuery = true)
    int releaseReserved(@Param("warehouseId") Long warehouseId, @Param("productId") Long productId, @Param("qty") int qty);
}
