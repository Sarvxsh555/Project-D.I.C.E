package com.example.dealengine.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Subset of quotation-service's Quotation JSON that the Deal Engine actually needs. */
@JsonIgnoreProperties(ignoreUnknown = true)
public class QuoteSnapshotDto {
    public Long id;
    public String quoteNo;
    public Long customerId;
    public String customerName;
    public String repUsername;
    public String stage;
    public String approvalStatus;
    public double subtotal;
    public double discountTotal;
    public double taxTotal;
    public double total;
    public double marginPercent;
    public List<Line> lines;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Line {
        public Long productId;
        public String productName;
        public double quantity;
        public double unitPrice;
        public double discountPercent;
        public double taxPercent;
        public double lineTotal;
    }
}
