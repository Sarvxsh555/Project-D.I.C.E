package com.example.quotation.service;

import com.example.quotation.model.PipelineStage;
import com.example.quotation.model.Quotation;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class QuotationSpecifications {

    private QuotationSpecifications() {
    }

    public static Specification<Quotation> filter(
            PipelineStage stage, Long customerId, String repUsername,
            Instant from, Instant to, Double minAmount, Double maxAmount, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (stage != null) predicates.add(cb.equal(root.get("stage"), stage));
            if (customerId != null) predicates.add(cb.equal(root.get("customerId"), customerId));
            if (repUsername != null && !repUsername.isBlank()) predicates.add(cb.equal(root.get("repUsername"), repUsername));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            if (minAmount != null) predicates.add(cb.greaterThanOrEqualTo(root.get("total"), minAmount));
            if (maxAmount != null) predicates.add(cb.lessThanOrEqualTo(root.get("total"), maxAmount));
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("quoteNo")), like),
                        cb.like(cb.lower(root.get("customerName")), like)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
