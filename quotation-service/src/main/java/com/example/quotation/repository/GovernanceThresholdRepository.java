package com.example.quotation.repository;

import com.example.quotation.model.GovernanceThreshold;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GovernanceThresholdRepository extends JpaRepository<GovernanceThreshold, String> {
}
