package com.dice.service;

import com.dice.domain.Policy;
import com.dice.domain.enums.CustomerSegment;
import com.dice.domain.enums.PolicySeverity;
import com.dice.domain.enums.PolicyType;
import com.dice.repository.PolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiscountPolicyServiceTest {

    @Mock
    private PolicyRepository policyRepository;

    private DiscountPolicyService service;

    private Policy tierPolicy;
    private Policy categoryPolicy;
    private Policy tierAndCategoryPolicy;

    @BeforeEach
    void setUp() {
        service = new DiscountPolicyService(policyRepository);

        tierPolicy = policy("GOLD_DISCOUNT_CAP", "GOLD", null, "15.00", 50);
        categoryPolicy = policy("HARDWARE_DISCOUNT_CAP", null, "Hardware", "12.00", 60);
        tierAndCategoryPolicy = policy("GOLD_HARDWARE_DISCOUNT_CAP", "GOLD", "Hardware", "8.00", 40);
    }

    private Policy policy(String code, String tier, String category, String threshold, int priority) {
        return Policy.builder()
                .code(code)
                .name(code)
                .type(PolicyType.DISCOUNT_LIMIT)
                .severity(PolicySeverity.APPROVAL_REQUIRED)
                .customerTier(tier)
                .productCategory(category)
                .thresholdValue(new BigDecimal(threshold))
                .priority(priority)
                .active(true)
                .build();
    }

    @Test
    void resolvesTierScopedCeiling() {
        when(policyRepository.findByTypeAndActiveTrue(PolicyType.DISCOUNT_LIMIT))
                .thenReturn(List.of(tierPolicy));

        var ceiling = service.resolveDiscountCeiling("GOLD", CustomerSegment.ENTERPRISE, "Software");

        assertThat(ceiling).contains(new BigDecimal("15.00"));
    }

    @Test
    void resolvesCategoryScopedCeilingWhenTierDoesNotMatch() {
        when(policyRepository.findByTypeAndActiveTrue(PolicyType.DISCOUNT_LIMIT))
                .thenReturn(List.of(categoryPolicy));

        var ceiling = service.resolveDiscountCeiling("SILVER", CustomerSegment.SMB, "Hardware");

        assertThat(ceiling).contains(new BigDecimal("12.00"));
    }

    @Test
    void prefersMostSpecificMatchWhenBothTierAndCategoryApply() {
        when(policyRepository.findByTypeAndActiveTrue(PolicyType.DISCOUNT_LIMIT))
                .thenReturn(List.of(tierPolicy, categoryPolicy, tierAndCategoryPolicy));

        var ceiling = service.resolveDiscountCeiling("GOLD", CustomerSegment.ENTERPRISE, "Hardware");

        assertThat(ceiling).contains(new BigDecimal("8.00"));
    }

    @Test
    void returnsEmptyWhenNoPolicyIsConfigured() {
        when(policyRepository.findByTypeAndActiveTrue(PolicyType.DISCOUNT_LIMIT))
                .thenReturn(List.of());

        var ceiling = service.resolveDiscountCeiling("BRONZE", CustomerSegment.PARTNER, "Unknown");

        assertThat(ceiling).isEmpty();
    }

    @Test
    void ignoresPolicyScopedToADifferentTier() {
        when(policyRepository.findByTypeAndActiveTrue(PolicyType.DISCOUNT_LIMIT))
                .thenReturn(List.of(tierPolicy));

        var ceiling = service.resolveDiscountCeiling("BRONZE", CustomerSegment.SMB, "Software");

        assertThat(ceiling).isEmpty();
    }
}
