package com.example.inventory.controller;

import com.example.inventory.model.Backorder;
import com.example.inventory.model.InventoryReservation;
import com.example.inventory.model.WarehouseAllocation;
import com.example.inventory.service.InventoryService;
import com.example.inventory.web.ReserveRequest;
import com.example.inventory.web.StockCheckResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/stock/{productId}")
    public StockCheckResponse checkStock(@PathVariable Long productId) {
        return inventoryService.checkStock(productId);
    }

    @PostMapping("/reserve")
    public ResponseEntity<?> reserve(@Valid @RequestBody ReserveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.reserveStock(request.getOrderRef(), request.getProductId(), request.getQuantity()));
    }

    @PostMapping("/reserve-exact")
    public ResponseEntity<?> reserveExact(@RequestBody java.util.Map<String, Object> body) {
        String orderRef = (String) body.get("orderRef");
        Long warehouseId = Long.valueOf(String.valueOf(body.get("warehouseId")));
        Long productId = Long.valueOf(String.valueOf(body.get("productId")));
        int quantity = Integer.parseInt(String.valueOf(body.get("quantity")));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.reserveExact(orderRef, warehouseId, productId, quantity));
    }

    @PostMapping("/allocate/{reservationId}")
    public WarehouseAllocation allocate(@PathVariable Long reservationId) {
        return inventoryService.allocateStock(reservationId);
    }

    @PostMapping("/release/{reservationId}")
    public InventoryReservation release(@PathVariable Long reservationId) {
        return inventoryService.releaseStock(reservationId);
    }

    @PostMapping("/backorders/{productId}/consolidate")
    public List<InventoryReservation> consolidate(@PathVariable Long productId) {
        return inventoryService.consolidateBackorder(productId);
    }

    @GetMapping("/reservations")
    public List<InventoryReservation> reservations(@RequestParam String orderRef) {
        return inventoryService.getReservations(orderRef);
    }
}
