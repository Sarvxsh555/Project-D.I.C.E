package com.example.dealengine.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
public class QuoteVersionLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "quote_version_id")
    @JsonIgnore
    private QuoteVersion quoteVersion;

    private Long productId;
    private String productName;
    private double quantity;
    private double unitPrice;
    private double discountPercent;
    private double taxPercent;
    private double lineTotal;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public QuoteVersion getQuoteVersion() { return quoteVersion; }
    public void setQuoteVersion(QuoteVersion quoteVersion) { this.quoteVersion = quoteVersion; }
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public double getQuantity() { return quantity; }
    public void setQuantity(double quantity) { this.quantity = quantity; }
    public double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }
    public double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(double discountPercent) { this.discountPercent = discountPercent; }
    public double getTaxPercent() { return taxPercent; }
    public void setTaxPercent(double taxPercent) { this.taxPercent = taxPercent; }
    public double getLineTotal() { return lineTotal; }
    public void setLineTotal(double lineTotal) { this.lineTotal = lineTotal; }
}
