package com.dice.repository;

import com.dice.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findBySku(String sku);

    Optional<Product> findByOdooProductId(Long odooProductId);

    List<Product> findByCategoryAndActiveTrue(String category);

    List<Product> findByActiveTrue();
}
