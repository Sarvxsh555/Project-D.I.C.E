package com.example.login.admin;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Warehouse implements Identifiable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String location;
    private int stock;
    private String replenishment;
    private String shippingWeight;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
    public String getReplenishment() { return replenishment; }
    public void setReplenishment(String replenishment) { this.replenishment = replenishment; }
    public String getShippingWeight() { return shippingWeight; }
    public void setShippingWeight(String shippingWeight) { this.shippingWeight = shippingWeight; }
}
