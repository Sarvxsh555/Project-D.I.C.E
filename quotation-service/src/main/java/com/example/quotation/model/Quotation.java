package com.example.quotation.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String quoteNo;

    private Long customerId;
    private String customerName;

    // username of the sales rep who owns this quotation
    private String repUsername;

    @Enumerated(EnumType.STRING)
    private PipelineStage stage = PipelineStage.DRAFT;

    private String approvalStatus = "NOT_REQUIRED"; // NOT_REQUIRED | PENDING | APPROVED | REJECTED

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationLine> lines = new ArrayList<>();

    // server-computed totals, never trusted from the client
    private double subtotal;
    private double discountTotal;
    private double taxTotal;
    private double total;
    private double grossMargin;
    private double marginPercent;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getQuoteNo() { return quoteNo; }
    public void setQuoteNo(String quoteNo) { this.quoteNo = quoteNo; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getRepUsername() { return repUsername; }
    public void setRepUsername(String repUsername) { this.repUsername = repUsername; }
    public PipelineStage getStage() { return stage; }
    public void setStage(PipelineStage stage) { this.stage = stage; }
    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public List<QuotationLine> getLines() { return lines; }
    public void setLines(List<QuotationLine> lines) { this.lines = lines; }
    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }
    public double getDiscountTotal() { return discountTotal; }
    public void setDiscountTotal(double discountTotal) { this.discountTotal = discountTotal; }
    public double getTaxTotal() { return taxTotal; }
    public void setTaxTotal(double taxTotal) { this.taxTotal = taxTotal; }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
    public double getGrossMargin() { return grossMargin; }
    public void setGrossMargin(double grossMargin) { this.grossMargin = grossMargin; }
    public double getMarginPercent() { return marginPercent; }
    public void setMarginPercent(double marginPercent) { this.marginPercent = marginPercent; }
}
