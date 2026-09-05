package com.example.fulfillment.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
public class FulfillmentAllocationLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "plan_id")
    @JsonIgnore
    private FulfillmentPlan plan;

    private Long productId;
    private String productName;
    private Long warehouseId;
    private String warehouseName; // null for a BACKORDER line
    private int quantity;
    private double shippingCost;
    private boolean backordered;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public FulfillmentPlan getPlan() { return plan; }
    public void setPlan(FulfillmentPlan plan) { this.plan = plan; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public Long getWarehouseId() { return warehouseId; }
    public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }
    public String getWarehouseName() { return warehouseName; }
    public void setWarehouseName(String warehouseName) { this.warehouseName = warehouseName; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public double getShippingCost() { return shippingCost; }
    public void setShippingCost(double shippingCost) { this.shippingCost = shippingCost; }
    public boolean isBackordered() { return backordered; }
    public void setBackordered(boolean backordered) { this.backordered = backordered; }
}
