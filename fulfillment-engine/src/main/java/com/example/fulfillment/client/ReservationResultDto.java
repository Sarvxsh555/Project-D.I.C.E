package com.example.fulfillment.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ReservationResultDto {
    public List<Reservation> reservations;
    public int quantityRequested;
    public int quantityReserved;
    public Backorder backorder;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Reservation {
        public Long id;
        public Long warehouseId;
        public int quantity;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Backorder {
        public Long id;
        public int quantity;
    }
}
