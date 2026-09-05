package com.dice.repository;

import com.dice.domain.Invoice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    @EntityGraph(attributePaths = {"lines", "customer"})
    List<Invoice> findByDealId(UUID dealId);

    @EntityGraph(attributePaths = {"lines", "customer"})
    Optional<Invoice> findWithLinesById(UUID id);

    List<Invoice> findBySubscriptionId(UUID subscriptionId);
}
