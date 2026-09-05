package com.example.login.admin;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class SubscriptionPlan implements Identifiable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String billingCycle;
    private double price;
    private String proration;
    private String cancellation;
    private String refund;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getBillingCycle() { return billingCycle; }
    public void setBillingCycle(String billingCycle) { this.billingCycle = billingCycle; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public String getProration() { return proration; }
    public void setProration(String proration) { this.proration = proration; }
    public String getCancellation() { return cancellation; }
    public void setCancellation(String cancellation) { this.cancellation = cancellation; }
    public String getRefund() { return refund; }
    public void setRefund(String refund) { this.refund = refund; }
}
