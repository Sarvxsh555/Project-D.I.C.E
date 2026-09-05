package com.dice.repository;

import com.dice.domain.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {

    List<Evaluation> findByDealIdOrderByCreatedAtDesc(UUID dealId);

    Optional<Evaluation> findFirstByDealIdOrderByCreatedAtDesc(UUID dealId);
}
