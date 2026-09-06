package com.example.dealengine.repository;

import com.example.dealengine.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByDealId(Long dealId);
    Optional<Order> findByQuotationId(Long quotationId);
    boolean existsByOrderNo(String orderNo);
    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Order> findAllByOrderByCreatedAtDesc();
}
