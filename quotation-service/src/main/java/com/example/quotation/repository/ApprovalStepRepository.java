package com.example.quotation.repository;

import com.example.quotation.model.ApprovalStep;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, Long> {
    List<ApprovalStep> findByQuotationIdOrderByStepOrderAsc(Long quotationId);
    void deleteByQuotationId(Long quotationId);
}
