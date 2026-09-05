package com.example.governance.repository;

import com.example.governance.model.GovernanceEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GovernanceEvaluationRepository extends JpaRepository<GovernanceEvaluation, Long> {
    List<GovernanceEvaluation> findByQuotationIdOrderByCreatedAtDesc(Long quotationId);
}
