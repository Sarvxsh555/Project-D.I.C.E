package com.dice.engine.policy;

import com.dice.domain.Customer;
import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Policy;
import com.dice.domain.Product;
import com.dice.domain.enums.CustomerSegment;
import com.dice.domain.enums.PolicySeverity;
import com.dice.domain.enums.PolicyType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PolicyEngineLineDiscountTest {

    private final PolicyEngine engine = new PolicyEngine();

    private Policy discountPolicy(String code, String tier, String category, String threshold) {
        return Policy.builder()
                .code(code)
                .name(code)
                .type(PolicyType.DISCOUNT_LIMIT)
                .severity(PolicySeverity.APPROVAL_REQUIRED)
                .customerTier(tier)
                .productCategory(category)
                .thresholdValue(new BigDecimal(threshold))
                .priority(50)
                .active(true)
                .build();
    }

    private Customer customer(String tier) {
        return Customer.builder()
                .id(UUID.randomUUID())
                .name("Test Customer")
                .segment(CustomerSegment.MID_MARKET)
                .tier(tier)
                .build();
    }

    private DealLine line(String category, String discountPercent) {
        Product product = Product.builder()
                .sku("SKU-" + category)
                .name(category)
                .category(category)
                .listPrice(new BigDecimal("100.00"))
                .standardCost(new BigDecimal("50.00"))
                .active(true)
                .build();

        return DealLine.builder()
                .id(UUID.randomUUID())
                .product(product)
                .quantity(1)
                .unitPrice(new BigDecimal("100.00"))
                .discountPercent(new BigDecimal(discountPercent))
                .build();
    }

    private Deal dealOf(DealLine... lines) {
        Deal deal = Deal.builder().build();
        for (DealLine l : lines) {
            deal.addLine(l);
        }
        return deal;
    }

    @Test
    void compliantLineWithinCeilingReportsNoViolation() {
        DealLine line = line("Service", "10");
        Deal deal = dealOf(line);
        List<Policy> policies = List.of(discountPolicy("SERVICE_CAP", null, "Service", "20"));

        var results = engine.evaluateLineDiscounts(deal, customer("GOLD"), policies);

        assertThat(results).hasSize(1);
        var result = results.get(0);
        assertThat(result.lineId()).isEqualTo(line.getId());
        assertThat(result.allowedDiscount()).isEqualByComparingTo("20");
        assertThat(result.actualDiscount()).isEqualByComparingTo("10");
        assertThat(result.overage()).isEqualByComparingTo("0");
        assertThat(result.compliant()).isTrue();
        assertThat(result.reason()).isNull();
    }

    @Test
    void nonCompliantLineReportsOverageAndCategoryReasonCode() {
        DealLine line = line("Service", "18");
        Deal deal = dealOf(line);
        List<Policy> policies = List.of(discountPolicy("SERVICE_CAP", null, "Service", "10"));

        var result = engine.evaluateLineDiscounts(deal, customer("GOLD"), policies).get(0);

        assertThat(result.allowedDiscount()).isEqualByComparingTo("10");
        assertThat(result.actualDiscount()).isEqualByComparingTo("18");
        assertThat(result.overage()).isEqualByComparingTo("8");
        assertThat(result.compliant()).isFalse();
        assertThat(result.reason()).isEqualTo("SERVICE_DISCOUNT_EXCEEDED");
    }

    @Test
    void tierScopedPolicyAppliesWhenNoCategoryPolicyExists() {
        DealLine line = line("Hardware", "20");
        Deal deal = dealOf(line);
        List<Policy> policies = List.of(discountPolicy("BRONZE_CAP", "BRONZE", null, "5"));

        var result = engine.evaluateLineDiscounts(deal, customer("BRONZE"), policies).get(0);

        assertThat(result.allowedDiscount()).isEqualByComparingTo("5");
        assertThat(result.compliant()).isFalse();
        assertThat(result.reason()).isEqualTo("BRONZE_TIER_DISCOUNT_EXCEEDED");
    }

    @Test
    void mostSpecificPolicyWinsWhenTierAndCategoryBothApply() {
        DealLine line = line("Hardware", "9");
        Deal deal = dealOf(line);
        List<Policy> policies = List.of(
                discountPolicy("GOLD_CAP", "GOLD", null, "15"),
                discountPolicy("HARDWARE_CAP", null, "Hardware", "12"),
                discountPolicy("GOLD_HARDWARE_CAP", "GOLD", "Hardware", "8"));

        var result = engine.evaluateLineDiscounts(deal, customer("GOLD"), policies).get(0);

        assertThat(result.allowedDiscount()).isEqualByComparingTo("8");
        assertThat(result.compliant()).isFalse();
        assertThat(result.overage()).isEqualByComparingTo("1");
    }

    @Test
    void lineWithNoApplicablePolicyIsTreatedAsCompliant() {
        DealLine line = line("Unconfigured", "50");
        Deal deal = dealOf(line);

        var result = engine.evaluateLineDiscounts(deal, customer("GOLD"), List.of()).get(0);

        assertThat(result.allowedDiscount()).isNull();
        assertThat(result.compliant()).isTrue();
        assertThat(result.reason()).isNull();
    }

    @Test
    void multipleLinesAreEvaluatedIndependently() {
        DealLine compliantLine = line("Software", "5");
        DealLine breachingLine = line("Hardware", "25");
        Deal deal = dealOf(compliantLine, breachingLine);
        List<Policy> policies = List.of(
                discountPolicy("SOFTWARE_CAP", null, "Software", "15"),
                discountPolicy("HARDWARE_CAP", null, "Hardware", "12"));

        var results = engine.evaluateLineDiscounts(deal, customer("SILVER"), policies);

        assertThat(results).hasSize(2);
        assertThat(results).anySatisfy(r -> {
            assertThat(r.lineId()).isEqualTo(compliantLine.getId());
            assertThat(r.compliant()).isTrue();
        });
        assertThat(results).anySatisfy(r -> {
            assertThat(r.lineId()).isEqualTo(breachingLine.getId());
            assertThat(r.compliant()).isFalse();
            assertThat(r.overage()).isEqualByComparingTo("13");
        });
    }
}
