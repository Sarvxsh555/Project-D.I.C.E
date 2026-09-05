package com.dice.repository;

import com.dice.domain.Customer;
import com.dice.domain.enums.CustomerSegment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Optional<Customer> findByOdooPartnerId(Long odooPartnerId);

    List<Customer> findBySegment(CustomerSegment segment);

    List<Customer> findByActiveTrue();
}
