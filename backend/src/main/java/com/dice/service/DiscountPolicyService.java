package com.dice.service;

import com.dice.domain.Policy;
import com.dice.domain.enums.CustomerSegment;
import com.dice.domain.enums.PolicyType;
import com.dice.repository.PolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.Optional;

/**
 * Looks up the configured discount ceiling for a customer tier / segment and
 * product category — nothing here is hardcoded, it all comes from
 * {@link Policy} rows of type {@link PolicyType#DISCOUNT_LIMIT}.
 *
 * <p>Read-only lookup, kept separate from {@code PolicyEngine}: this answers
 * "what is the ceiling right now" for callers that just need the number (a
 * quote-builder UI, a what-if check), while the engine is what compares a
 * deal against it and reports violations.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiscountPolicyService {

    private final PolicyRepository policyRepository;

    /**
     * The discount ceiling that applies to {@code productCategory} for a
     * customer of the given tier/segment, or empty if no policy configures one.
     * "Most specific wins" — see {@link Policy#specificity()}.
     */
    public Optional<BigDecimal> resolveDiscountCeiling(String customerTier,
                                                        CustomerSegment segment,
                                                        String productCategory) {
        return policyRepository.findByTypeAndActiveTrue(PolicyType.DISCOUNT_LIMIT).stream()
                .filter(p -> p.getCustomerTier() == null || p.getCustomerTier().equalsIgnoreCase(customerTier))
                .filter(p -> p.getSegment() == null || p.getSegment() == segment)
                .filter(p -> p.getProductCategory() == null || p.getProductCategory().equals(productCategory))
                .max(Comparator.comparingInt(Policy::specificity)
                        .thenComparing(Comparator.comparingInt(Policy::getPriority).reversed()))
                .map(Policy::getThresholdValue);
    }
}
