package com.example.inventory.model;

import jakarta.persistence.*;

/** One row per (warehouse, product). Available = quantityOnHand - quantityReserved. This is
 *  the row that gets pessimistically locked during reserve/release to prevent overselling
 *  when two reservations race for the same stock. */
@Entity
@Table(name = "inventory", uniqueConstraints = @UniqueConstraint(columnNames = {"warehouse_id", "product_id"}))
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    private int quantityOnHand;
    private int quantityReserved;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public int getQuantityOnHand() { return quantityOnHand; }
    public void setQuantityOnHand(int quantityOnHand) { this.quantityOnHand = quantityOnHand; }
    public int getQuantityReserved() { return quantityReserved; }
    public void setQuantityReserved(int quantityReserved) { this.quantityReserved = quantityReserved; }

    @Transient
    public int getAvailable() { return quantityOnHand - quantityReserved; }
}
