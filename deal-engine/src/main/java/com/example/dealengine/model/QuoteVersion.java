package com.example.dealengine.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Immutable snapshot of a quote's state at a point in time. quotation-service holds the live,
 * editable quote; every time something notable happens (submit, approve, convert) the Deal
 * Engine snapshots it here, so "what did version 3 actually say" is always answerable even
 * after the rep keeps editing the live quote.
 */
@Entity
public class QuoteVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long dealId;
    private int versionNumber;
    private String reason; // why this snapshot was taken, e.g. "Submitted for approval", "Converted to order"

    private String stageAtSnapshot;
    private double subtotal;
    private double discountTotal;
    private double taxTotal;
    private double total;
    private double marginPercent;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "quoteVersion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<QuoteVersionLine> lines = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDealId() { return dealId; }
    public void setDealId(Long dealId) { this.dealId = dealId; }
    public int getVersionNumber() { return versionNumber; }
    public void setVersionNumber(int versionNumber) { this.versionNumber = versionNumber; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStageAtSnapshot() { return stageAtSnapshot; }
    public void setStageAtSnapshot(String stageAtSnapshot) { this.stageAtSnapshot = stageAtSnapshot; }
    public double getSubtotal() { return subtotal; }
    public void setSubtotal(double subtotal) { this.subtotal = subtotal; }
    public double getDiscountTotal() { return discountTotal; }
    public void setDiscountTotal(double discountTotal) { this.discountTotal = discountTotal; }
    public double getTaxTotal() { return taxTotal; }
    public void setTaxTotal(double taxTotal) { this.taxTotal = taxTotal; }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
    public double getMarginPercent() { return marginPercent; }
    public void setMarginPercent(double marginPercent) { this.marginPercent = marginPercent; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<QuoteVersionLine> getLines() { return lines; }
    public void setLines(List<QuoteVersionLine> lines) { this.lines = lines; }
}
