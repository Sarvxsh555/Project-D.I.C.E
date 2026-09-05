package com.example.dealengine.repository;

import com.example.dealengine.model.Deal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DealRepository extends JpaRepository<Deal, Long> {
    Optional<Deal> findByQuotationId(Long quotationId);
}
