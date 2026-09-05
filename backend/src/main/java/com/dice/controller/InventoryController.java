package com.dice.controller;

import com.dice.domain.Inventory;
import com.dice.domain.Product;
import com.dice.domain.Warehouse;
import com.dice.repository.ProductRepository;
import com.dice.repository.WarehouseRepository;
import com.dice.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Authoritative stock lookup. Never accepts a quantity from the caller —
 * every response is read straight from {@link Inventory}.
 */
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN')")
public class InventoryController {

    private final InventoryService inventoryService;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;

    /** How much of a product is available in one specific warehouse. */
    @GetMapping("/{warehouseCode}/{sku}")
    public StockView stockAt(@PathVariable String warehouseCode, @PathVariable String sku) {
        Warehouse warehouse = warehouseRepository.findByCode(warehouseCode)
                .orElseThrow(() -> new IllegalArgumentException("No warehouse with code " + warehouseCode));
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new IllegalArgumentException("No product with sku " + sku));

        return inventoryService.find(warehouse.getId(), product.getId())
                .map(inv -> StockView.from(warehouse, product, inv))
                .orElse(new StockView(warehouse.getCode(), product.getSku(), 0, 0, 0));
    }

    /** Stock for a product across every warehouse. */
    @GetMapping("/product/{sku}")
    public List<StockView> stockByProduct(@PathVariable String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new IllegalArgumentException("No product with sku " + sku));

        return inventoryService.byProduct(product.getId()).stream()
                .map(inv -> StockView.from(inv.getWarehouse(), product, inv))
                .toList();
    }

    public record StockView(String warehouseCode, String sku, int availableQty,
                            int reservedQty, int fulfilledQty) {
        static StockView from(Warehouse warehouse, Product product, Inventory inv) {
            return new StockView(warehouse.getCode(), product.getSku(),
                    inv.getAvailableQty(), inv.getReservedQty(), inv.getFulfilledQty());
        }
    }
}
