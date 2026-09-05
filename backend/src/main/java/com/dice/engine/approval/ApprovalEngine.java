package com.dice.engine.approval;

import com.dice.domain.Deal;
import com.dice.domain.enums.PolicySeverity;
import com.dice.engine.policy.PolicyEngine;
import com.dice.security.Role;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns policy violations into the set of sign-offs a deal needs.
 *
 * <p>Deduplicates by role: three breaches that all need a SALES_MANAGER produce
 * one request listing all three, not three requests. Reviewers hate queues.
 */
@Component
public class ApprovalEngine {

    /** How long an approver has before the request shows as overdue. */
    private static final Map<Role, Duration> SLA_BY_ROLE = Map.of(
            Role.SALES_MANAGER, Duration.ofHours(4),
            Role.FINANCE, Duration.ofHours(8),
            Role.OPERATIONS, Duration.ofHours(8),
            Role.ADMIN, Duration.ofHours(24));

    private static final Duration DEFAULT_SLA = Duration.ofHours(8);

    /** Fallback when a policy row names no role, or names one we don't know. */
    private static final Role FALLBACK_ROLE = Role.SALES_MANAGER;

    public List<Requirement> determineRequired(Deal deal, PolicyEngine.PolicyReport report) {
        // LinkedHashMap keeps the highest-severity role first in the output.
        Map<Role, List<PolicyEngine.Violation>> byRole = new LinkedHashMap<>();

        for (PolicyEngine.Violation violation : report.violations()) {
            if (violation.severity() == PolicySeverity.ADVISORY) {
                continue;
            }
            Role role = resolveRole(violation);
            byRole.computeIfAbsent(role, k -> new java.util.ArrayList<>()).add(violation);
        }

        Instant now = Instant.now();
        return byRole.entrySet().stream()
                .map(entry -> new Requirement(
                        entry.getKey(),
                        entry.getValue().stream().map(PolicyEngine.Violation::policyCode).toList(),
                        summarise(entry.getValue()),
                        now.plus(SLA_BY_ROLE.getOrDefault(entry.getKey(), DEFAULT_SLA)),
                        entry.getValue().stream()
                                .anyMatch(v -> v.severity() == PolicySeverity.BLOCKING)))
                // Most authoritative role first, so the UI leads with the real blocker.
                .sorted(Comparator.comparing(Requirement::role).reversed())
                .toList();
    }

    /**
     * A BLOCKING breach can only be waived by ADMIN, whatever the policy row says
     * — otherwise a hard floor would not be a hard floor.
     */
    private Role resolveRole(PolicyEngine.Violation violation) {
        if (violation.severity() == PolicySeverity.BLOCKING) {
            return Role.ADMIN;
        }
        if (violation.requiredRole() == null || violation.requiredRole().isBlank()) {
            return FALLBACK_ROLE;
        }
        try {
            return Role.valueOf(violation.requiredRole());
        } catch (IllegalArgumentException e) {
            return FALLBACK_ROLE;
        }
    }

    private String summarise(List<PolicyEngine.Violation> violations) {
        if (violations.size() == 1) {
            return violations.getFirst().message();
        }
        return violations.stream()
                .map(v -> "- " + v.message())
                .collect(java.util.stream.Collectors.joining("\n",
                        violations.size() + " policy breaches need sign-off:\n", ""));
    }

    /** One approval request to be raised. */
    public record Requirement(
            Role role,
            List<String> policyCodes,
            String reason,
            Instant slaDueAt,
            /** True when at least one breach is a hard floor rather than an escalation. */
            boolean overridesBlocking) {
    }
}
