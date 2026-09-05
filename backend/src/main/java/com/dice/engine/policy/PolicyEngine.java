package com.dice.engine.policy;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Policy;
import com.dice.domain.enums.PolicySeverity;
import com.dice.engine.margin.MarginEngine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Applies the configured {@link Policy} rows to a deal and reports what it
 * breaches.
 *
 * <p>Scoping: for each {@code PolicyType} only the most specific applicable
 * policy is evaluated, so a segment-level discount cap overrides the global
 * one rather than both firing. See {@link Policy#specificity()}.
 *
 * <p>The engine never mutates the deal and never decides what to <em>do</em>
 * about a breach — that is {@code DecisionResolver}'s job.
 */
@Component
@Slf4j
public class PolicyEngine {

    public PolicyReport evaluate(Deal deal,
                                 Customer customer,
                                 MarginEngine.MarginResult margin,
                                 List<Policy> candidates) {

        List<Policy> applicable = selectApplicable(deal, customer, candidates);
        List<Violation> violations = new ArrayList<>();

        for (Policy policy : applicable) {
            switch (policy.getType()) {
                case DISCOUNT_LIMIT -> checkDiscountLimit(deal, policy).ifPresent(violations::add);
                case MARGIN_FLOOR -> checkMarginFloor(margin, policy).ifPresent(violations::add);
                case CREDIT_LIMIT -> checkCreditLimit(deal, customer, policy).ifPresent(violations::add);
                case APPROVAL_THRESHOLD -> checkApprovalThreshold(deal, policy).ifPresent(violations::add);
                case QUANTITY_LIMIT -> violations.addAll(checkQuantityLimit(deal, policy));
                case PAYMENT_TERMS -> checkPaymentTerms(customer, policy).ifPresent(violations::add);
            }
        }

        violations.sort(Comparator.comparing((Violation v) -> v.severity().ordinal()).reversed());
        return new PolicyReport(applicable.stream().map(Policy::getCode).toList(), List.copyOf(violations));
    }

    /**
     * Narrows the candidate set to one policy per type: the most specific match,
     * with {@code priority} breaking ties.
     */
    private List<Policy> selectApplicable(Deal deal, Customer customer, List<Policy> candidates) {
        List<String> categories = deal.getLines().stream()
                .map(line -> line.getProduct().getCategory())
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        Map<com.dice.domain.enums.PolicyType, List<Policy>> byType = candidates.stream()
                .filter(Policy::isActive)
                .filter(p -> p.getSegment() == null || p.getSegment() == customer.getSegment())
                .filter(p -> p.getProductCategory() == null || categories.contains(p.getProductCategory()))
                .collect(Collectors.groupingBy(Policy::getType));

        return byType.values().stream()
                .map(group -> group.stream()
                        .max(Comparator.comparingInt(Policy::specificity)
                                .thenComparing(Comparator.comparingInt(Policy::getPriority).reversed()))
                        .orElseThrow())
                .sorted(Comparator.comparingInt(Policy::getPriority))
                .toList();
    }

    private java.util.Optional<Violation> checkDiscountLimit(Deal deal, Policy policy) {
        BigDecimal actual = deal.effectiveDiscountPercent();
        return compare(actual, policy.getThresholdValue(), Direction.MUST_NOT_EXCEED, policy,
                "Discount of %s%% exceeds the %s%% cap"
                        .formatted(scale(actual), scale(policy.getThresholdValue())));
    }

    private java.util.Optional<Violation> checkMarginFloor(MarginEngine.MarginResult margin, Policy policy) {
        BigDecimal actual = margin.marginPercent();
        return compare(actual, policy.getThresholdValue(), Direction.MUST_NOT_FALL_BELOW, policy,
                "Margin of %s%% is below the %s%% floor"
                        .formatted(scale(actual), scale(policy.getThresholdValue())));
    }

    private java.util.Optional<Violation> checkCreditLimit(Deal deal, Customer customer, Policy policy) {
        // Threshold is the fraction of available credit a single deal may consume.
        BigDecimal available = customer.availableCredit();
        BigDecimal total = deal.getTotalAmount();
        if (available.signum() == 0) {
            return java.util.Optional.of(new Violation(policy.getCode(), policy.getName(),
                    policy.getType(), policy.getSeverity(), policy.getRequiredRole(),
                    total, BigDecimal.ZERO,
                    "Customer has no available credit"));
        }
        BigDecimal usedPercent = total.divide(available, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        return compare(usedPercent, policy.getThresholdValue(), Direction.MUST_NOT_EXCEED, policy,
                "Deal consumes %s%% of available credit (cap %s%%)"
                        .formatted(scale(usedPercent), scale(policy.getThresholdValue())));
    }

    private java.util.Optional<Violation> checkApprovalThreshold(Deal deal, Policy policy) {
        BigDecimal actual = deal.getTotalAmount();
        return compare(actual, policy.getThresholdValue(), Direction.MUST_NOT_EXCEED, policy,
                "Deal value %s exceeds the %s sign-off threshold"
                        .formatted(scale(actual), scale(policy.getThresholdValue())));
    }

    private List<Violation> checkQuantityLimit(Deal deal, Policy policy) {
        return deal.getLines().stream()
                .filter(line -> BigDecimal.valueOf(line.getQuantity())
                        .compareTo(policy.getThresholdValue()) > 0)
                .map(line -> new Violation(policy.getCode(), policy.getName(),
                        policy.getType(), policy.getSeverity(), policy.getRequiredRole(),
                        BigDecimal.valueOf(line.getQuantity()), policy.getThresholdValue(),
                        "Line %s orders %d units, above the %s unit cap"
                                .formatted(line.getProduct().getSku(), line.getQuantity(),
                                        scale(policy.getThresholdValue()))))
                .toList();
    }

    private java.util.Optional<Violation> checkPaymentTerms(Customer customer, Policy policy) {
        Integer terms = customer.getPaymentTermsDays();
        if (terms == null) {
            return java.util.Optional.empty();
        }
        return compare(BigDecimal.valueOf(terms), policy.getThresholdValue(),
                Direction.MUST_NOT_EXCEED, policy,
                "Payment terms of %d days exceed the %s day maximum"
                        .formatted(terms, scale(policy.getThresholdValue())));
    }

    private java.util.Optional<Violation> compare(BigDecimal actual,
                                                  BigDecimal threshold,
                                                  Direction direction,
                                                  Policy policy,
                                                  String message) {
        if (actual == null || threshold == null) {
            log.debug("Skipping policy {}: missing value", policy.getCode());
            return java.util.Optional.empty();
        }
        boolean breached = switch (direction) {
            case MUST_NOT_EXCEED -> actual.compareTo(threshold) > 0;
            case MUST_NOT_FALL_BELOW -> actual.compareTo(threshold) < 0;
        };
        if (!breached) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(new Violation(
                policy.getCode(), policy.getName(), policy.getType(), policy.getSeverity(),
                policy.getRequiredRole(), actual, threshold, message));
    }

    private static BigDecimal scale(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private enum Direction { MUST_NOT_EXCEED, MUST_NOT_FALL_BELOW }

    /** Everything the engine considered, and everything it found wrong. */
    public record PolicyReport(List<String> evaluatedPolicyCodes, List<Violation> violations) {

        public boolean isClean() {
            return violations.isEmpty();
        }

        public boolean hasBlocking() {
            return violations.stream().anyMatch(v -> v.severity() == PolicySeverity.BLOCKING);
        }

        public List<Violation> requiringApproval() {
            return violations.stream()
                    .filter(v -> v.severity() == PolicySeverity.APPROVAL_REQUIRED)
                    .toList();
        }
    }

    /** A single breach, carrying enough context to explain itself in the UI. */
    public record Violation(
            String policyCode,
            String policyName,
            com.dice.domain.enums.PolicyType type,
            PolicySeverity severity,
            String requiredRole,
            BigDecimal actualValue,
            BigDecimal thresholdValue,
            String message) {
    }
}
