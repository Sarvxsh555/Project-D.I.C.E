package com.example.quotation.repository;

import com.example.quotation.model.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
    List<AuditEvent> findByQuotationIdOrderByCreatedAtAsc(Long quotationId);
}
