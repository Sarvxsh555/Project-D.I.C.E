package com.dice.repository;

import com.dice.domain.Negotiation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NegotiationRepository extends JpaRepository<Negotiation, UUID> {

    @EntityGraph(attributePaths = {"deal", "deal.customer", "customer"})
    Optional<Negotiation> findByDealId(UUID dealId);

    boolean existsByDealId(UUID dealId);
}
