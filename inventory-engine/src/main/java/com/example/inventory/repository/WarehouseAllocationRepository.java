package com.example.inventory.repository;

import com.example.inventory.model.WarehouseAllocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WarehouseAllocationRepository extends JpaRepository<WarehouseAllocation, Long> {
    List<WarehouseAllocation> findByReservationId(Long reservationId);
}
