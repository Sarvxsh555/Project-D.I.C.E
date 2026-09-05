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

    /** DealSummary needs customer.name; without this it lazy-inits outside the
     *  session once Page.map() runs back in the controller and throws. */
    @EntityGraph(attributePaths = {"customer"})
    Page<Deal> findByStatus(DealStatus status, Pageable pageable);

    /** Same reasoning as findByStatus above — used by the unfiltered list. */
    @EntityGraph(attributePaths = {"customer"})
    @Query("select d from Deal d")
    Page<Deal> findAllWithCustomer(Pageable pageable);

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
