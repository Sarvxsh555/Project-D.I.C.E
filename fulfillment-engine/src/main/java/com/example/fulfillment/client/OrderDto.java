package com.example.fulfillment.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderDto {
    public Long id;
    public String orderNo;
    public Long dealId;
    public Long quotationId;
    public String status;
    public List<Line> lines;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Line {
        public Long productId;
        public String productName;
        public double quantity;
    }
}
