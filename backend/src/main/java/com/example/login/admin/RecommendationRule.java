package com.example.login.admin;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class RecommendationRule implements Identifiable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String productA;
    private String productB;
    private double coPurchaseScore;
    private String promotion;
    private double minimumMargin;
    private int priority;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getProductA() { return productA; }
    public void setProductA(String productA) { this.productA = productA; }
    public String getProductB() { return productB; }
    public void setProductB(String productB) { this.productB = productB; }
    public double getCoPurchaseScore() { return coPurchaseScore; }
    public void setCoPurchaseScore(double coPurchaseScore) { this.coPurchaseScore = coPurchaseScore; }
    public String getPromotion() { return promotion; }
    public void setPromotion(String promotion) { this.promotion = promotion; }
    public double getMinimumMargin() { return minimumMargin; }
    public void setMinimumMargin(double minimumMargin) { this.minimumMargin = minimumMargin; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
}
