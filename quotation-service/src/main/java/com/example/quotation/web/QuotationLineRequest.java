package com.example.quotation.web;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class QuotationLineRequest {

    @NotNull
    private Long productId;

    @Positive
    private double quantity;

    private double discountPercent;

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public double getQuantity() { return quantity; }
    public void setQuantity(double quantity) { this.quantity = quantity; }
    public double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(double discountPercent) { this.discountPercent = discountPercent; }
}
