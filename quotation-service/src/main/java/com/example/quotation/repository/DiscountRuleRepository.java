package com.example.quotation.repository;

import com.example.quotation.model.DiscountRule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscountRuleRepository extends JpaRepository<DiscountRule, Long> {
}
