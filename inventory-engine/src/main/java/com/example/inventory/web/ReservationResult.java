package com.example.inventory.web;

import com.example.inventory.model.Backorder;
import com.example.inventory.model.InventoryReservation;

import java.util.List;

public class ReservationResult {
    public final List<InventoryReservation> reservations;
    public final int quantityRequested;
    public final int quantityReserved;
    public final Backorder backorder; // null if fully satisfied

    public ReservationResult(List<InventoryReservation> reservations, int quantityRequested,
                              int quantityReserved, Backorder backorder) {
        this.reservations = reservations;
        this.quantityRequested = quantityRequested;
        this.quantityReserved = quantityReserved;
        this.backorder = backorder;
    }
}
