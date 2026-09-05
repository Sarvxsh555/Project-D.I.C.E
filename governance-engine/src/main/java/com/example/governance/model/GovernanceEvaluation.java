package com.example.governance.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Immutable record of one evaluate() call - governance decisions must be reconstructable later. */
@Entity
public class GovernanceEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long quotationId;
    private double riskScore;
    private boolean approvalRequired;

    @Enumerated(EnumType.STRING)
    private com.example.governance.rules.RequiredLevel requiredLevel;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "governance_evaluation_reason", joinColumns = @JoinColumn(name = "evaluation_id"))
    @Column(name = "reason")
    private List<String> reasons = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }
    public double getRiskScore() { return riskScore; }
    public void setRiskScore(double riskScore) { this.riskScore = riskScore; }
    public boolean isApprovalRequired() { return approvalRequired; }
    public void setApprovalRequired(boolean approvalRequired) { this.approvalRequired = approvalRequired; }
    public com.example.governance.rules.RequiredLevel getRequiredLevel() { return requiredLevel; }
    public void setRequiredLevel(com.example.governance.rules.RequiredLevel requiredLevel) { this.requiredLevel = requiredLevel; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<String> getReasons() { return reasons; }
    public void setReasons(List<String> reasons) { this.reasons = reasons; }
}
