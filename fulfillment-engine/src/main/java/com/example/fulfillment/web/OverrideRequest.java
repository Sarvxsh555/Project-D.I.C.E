package com.example.fulfillment.web;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class OverrideRequest {
    @NotEmpty
    private List<OverrideLine> lines;

    public List<OverrideLine> getLines() { return lines; }
    public void setLines(List<OverrideLine> lines) { this.lines = lines; }

    public static class OverrideLine {
        private Long productId;
        private Long warehouseId;
        private int quantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Long getWarehouseId() { return warehouseId; }
        public void setWarehouseId(Long warehouseId) { this.warehouseId = warehouseId; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
    }
}
