package com.example.inventory.web;

import java.util.List;

public class StockCheckResponse {
    public final Long productId;
    public final int totalAvailable;
    public final List<StockLine> byWarehouse;

    public StockCheckResponse(Long productId, int totalAvailable, List<StockLine> byWarehouse) {
        this.productId = productId;
        this.totalAvailable = totalAvailable;
        this.byWarehouse = byWarehouse;
    }
}
