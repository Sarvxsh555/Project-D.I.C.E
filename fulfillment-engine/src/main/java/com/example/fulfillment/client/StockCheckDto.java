package com.example.fulfillment.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class StockCheckDto {
    public Long productId;
    public int totalAvailable;
    public List<Line> byWarehouse;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Line {
        public Long warehouseId;
        public String warehouseName;
        public int quantityOnHand;
        public int quantityReserved;
        public int available;
    }
}
