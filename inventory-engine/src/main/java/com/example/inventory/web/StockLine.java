package com.example.inventory.web;

public class StockLine {
    public final Long warehouseId;
    public final String warehouseName;
    public final int quantityOnHand;
    public final int quantityReserved;
    public final int available;

    public StockLine(Long warehouseId, String warehouseName, int quantityOnHand, int quantityReserved) {
        this.warehouseId = warehouseId;
        this.warehouseName = warehouseName;
        this.quantityOnHand = quantityOnHand;
        this.quantityReserved = quantityReserved;
        this.available = quantityOnHand - quantityReserved;
    }
}
