package com.dice.repository;

import com.dice.domain.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {

    Optional<Warehouse> findByCode(String code);

    List<Warehouse> findByActiveTrueOrderByDispatchDaysAsc();

    List<Warehouse> findByRegionAndActiveTrue(String region);
}
