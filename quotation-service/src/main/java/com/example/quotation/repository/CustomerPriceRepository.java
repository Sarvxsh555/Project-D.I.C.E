package com.example.quotation.repository;

import com.example.quotation.model.CustomerPrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerPriceRepository extends JpaRepository<CustomerPrice, Long> {
    Optional<CustomerPrice> findByCustomerIdAndProductId(Long customerId, Long productId);
}
