package com.example.quotation.model;

import jakarta.persistence.*;

@Entity
public class ApprovalStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long quotationId;
    private int stepOrder;
    private String name; // e.g. "Sales Manager", "Finance"
    private String status = "PENDING"; // PENDING | APPROVED | REJECTED

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }
    public int getStepOrder() { return stepOrder; }
    public void setStepOrder(int stepOrder) { this.stepOrder = stepOrder; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
