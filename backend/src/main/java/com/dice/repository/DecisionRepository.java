package com.dice.repository;

import com.dice.domain.Decision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DecisionRepository extends JpaRepository<Decision, UUID> {

    List<Decision> findByDealIdOrderByCreatedAtDesc(UUID dealId);

    Optional<Decision> findFirstByDealIdOrderByCreatedAtDesc(UUID dealId);
}
