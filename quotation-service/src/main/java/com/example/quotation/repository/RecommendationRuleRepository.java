package com.example.quotation.repository;

import com.example.quotation.model.RecommendationRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecommendationRuleRepository extends JpaRepository<RecommendationRule, Long> {
    List<RecommendationRule> findByProductAIdOrderByPriorityAsc(Long productAId);
}
