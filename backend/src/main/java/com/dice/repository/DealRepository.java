package com.dice.repository;

import com.dice.domain.Deal;
import com.dice.domain.enums.DealStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DealRepository extends JpaRepository<Deal, UUID> {

    /** Lines are lazy by default; this fetches them for the detail view. */
    @EntityGraph(attributePaths = {"lines", "lines.product", "customer"})
    Optional<Deal> findWithLinesById(UUID id);

    Optional<Deal> findByDealNumber(String dealNumber);

    Optional<Deal> findByOdooQuotationId(Long odooQuotationId);

    Page<Deal> findByStatus(DealStatus status, Pageable pageable);

    Page<Deal> findByOwnerUsername(String ownerUsername, Pageable pageable);

    List<Deal> findByCustomerId(UUID customerId);

    long countByStatus(DealStatus status);

    /** Dashboard tile: pipeline value excluding closed-out deals. */
    @Query("""
           select coalesce(sum(d.totalAmount), 0)
           from Deal d
           where d.status not in (com.dice.domain.enums.DealStatus.REJECTED,
                                  com.dice.domain.enums.DealStatus.CANCELLED)
           """)
    java.math.BigDecimal sumOpenPipelineValue();
}
