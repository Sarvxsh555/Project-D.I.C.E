package com.example.governance.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class QuoteDto {
    public Long id;
    public String quoteNo;
    public Long customerId;
    public String customerName;
    public String stage;
    public double subtotal;
    public double discountTotal;
    public double total;
    public double marginPercent;
    public List<Line> lines;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Line {
        public Long productId;
        public String productName;
        public double quantity;
        public double discountPercent;
    }
}
