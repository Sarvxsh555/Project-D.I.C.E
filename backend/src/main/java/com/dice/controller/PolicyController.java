package com.dice.controller;

import com.dice.domain.Policy;
import com.dice.repository.PolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PolicyController {

    private final PolicyRepository policyRepository;

    @GetMapping("/policies")
    public List<Map<String, Object>> listPolicies() {
        return policyRepository.findAll().stream().map(p -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", p.getId().toString());
            map.put("code", p.getCode());
            map.put("name", p.getName());
            map.put("description", p.getDescription());
            map.put("type", p.getType() != null ? p.getType().name() : "DISCOUNT_LIMIT");
            map.put("severity", p.getSeverity() != null ? p.getSeverity().name() : "APPROVAL_REQUIRED");
            map.put("thresholdValue", p.getThresholdValue());
            map.put("requiredRole", p.getRequiredRole());
            map.put("isActive", p.isActive());
            map.put("active", p.isActive());
            return map;
        }).toList();
    }

    @PutMapping("/policies/{id}")
    public Map<String, Object> updatePolicy(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        Policy policy = policyRepository.findById(id).orElseThrow();
        if (updates.containsKey("thresholdValue")) {
            policy.setThresholdValue(new BigDecimal(updates.get("thresholdValue").toString()));
        }
        if (updates.containsKey("name")) {
            policy.setName(updates.get("name").toString());
        }
        if (updates.containsKey("active")) {
            policy.setActive(Boolean.parseBoolean(updates.get("active").toString()));
        }
        policy = policyRepository.save(policy);
        Map<String, Object> map = new java.util.LinkedHashMap<>();
        map.put("id", policy.getId().toString());
        map.put("code", policy.getCode());
        map.put("name", policy.getName());
        map.put("description", policy.getDescription());
        map.put("severity", policy.getSeverity().name());
        map.put("thresholdValue", policy.getThresholdValue());
        map.put("requiredRole", policy.getRequiredRole());
        map.put("isActive", policy.isActive());
        map.put("active", policy.isActive());
        return map;
    }

    @GetMapping("/discount-rules")
    public List<Map<String, Object>> listDiscountRules() {
        return policyRepository.findAll().stream()
                .filter(p -> p.getType() == com.dice.domain.enums.PolicyType.DISCOUNT_LIMIT)
                .map(p -> {
                    Map<String, Object> rule = new java.util.LinkedHashMap<>();
                    rule.put("id", p.getId().toString());
                    rule.put("name", p.getName());
                    rule.put("maxDiscount", p.getThresholdValue());
                    rule.put("tier", p.getCustomerTier() != null ? p.getCustomerTier() : "ALL");
                    rule.put("requiresApproval", p.getSeverity() == com.dice.domain.enums.PolicySeverity.APPROVAL_REQUIRED);
                    rule.put("approverRole", p.getRequiredRole());
                    rule.put("description", p.getDescription());
                    return rule;
                }).toList();
    }
}
