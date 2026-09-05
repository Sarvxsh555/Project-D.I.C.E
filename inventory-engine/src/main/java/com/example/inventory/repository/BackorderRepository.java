package com.example.inventory.repository;

import com.example.inventory.model.Backorder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BackorderRepository extends JpaRepository<Backorder, Long> {
    List<Backorder> findByProductIdAndStatusOrderByCreatedAtAsc(Long productId, String status);
    List<Backorder> findByOrderRef(String orderRef);
}
