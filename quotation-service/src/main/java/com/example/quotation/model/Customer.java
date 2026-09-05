package com.example.quotation.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String tier;
    private String email;
    private String region;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
}
