package com.example.login.admin;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class DiscountRule implements Identifiable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerTier;
    private String category;
    private double minDiscount;
    private double maxDiscount;
    private String riskLevel;
    private String approvalLevel;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCustomerTier() { return customerTier; }
    public void setCustomerTier(String customerTier) { this.customerTier = customerTier; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public double getMinDiscount() { return minDiscount; }
    public void setMinDiscount(double minDiscount) { this.minDiscount = minDiscount; }
    public double getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(double maxDiscount) { this.maxDiscount = maxDiscount; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }
    public String getApprovalLevel() { return approvalLevel; }
    public void setApprovalLevel(String approvalLevel) { this.approvalLevel = approvalLevel; }
}
