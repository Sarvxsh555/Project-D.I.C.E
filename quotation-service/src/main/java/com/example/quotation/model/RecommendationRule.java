package com.example.quotation.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class RecommendationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long productAId;
    private Long productBId;
    private double coPurchaseScore;
    private String promotion;
    private double marginImpactPercent;
    private int priority;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProductAId() { return productAId; }
    public void setProductAId(Long productAId) { this.productAId = productAId; }
    public Long getProductBId() { return productBId; }
    public void setProductBId(Long productBId) { this.productBId = productBId; }
    public double getCoPurchaseScore() { return coPurchaseScore; }
    public void setCoPurchaseScore(double coPurchaseScore) { this.coPurchaseScore = coPurchaseScore; }
    public String getPromotion() { return promotion; }
    public void setPromotion(String promotion) { this.promotion = promotion; }
    public double getMarginImpactPercent() { return marginImpactPercent; }
    public void setMarginImpactPercent(double marginImpactPercent) { this.marginImpactPercent = marginImpactPercent; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
}
