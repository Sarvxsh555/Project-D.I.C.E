package com.example.fulfillment.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
public class FulfillmentPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long orderId;

    private String status = "PROPOSED"; // PROPOSED | CONFIRMED
    private int shipmentCount;
    private double totalShippingCost;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<FulfillmentAllocationLine> lines = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getShipmentCount() { return shipmentCount; }
    public void setShipmentCount(int shipmentCount) { this.shipmentCount = shipmentCount; }
    public double getTotalShippingCost() { return totalShippingCost; }
    public void setTotalShippingCost(double totalShippingCost) { this.totalShippingCost = totalShippingCost; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public List<FulfillmentAllocationLine> getLines() { return lines; }
    public void setLines(List<FulfillmentAllocationLine> lines) { this.lines = lines; }
}
