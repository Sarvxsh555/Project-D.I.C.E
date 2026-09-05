package com.dice.engine.risk;

import com.dice.domain.Deal;
import com.dice.domain.DealLine;
import com.dice.domain.Product;
import com.dice.domain.enums.RiskLevel;
import com.dice.engine.policy.PolicyEngine;
import com.dice.security.Role;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ViolationRiskEngineTest {

    private final ViolationRiskEngine engine = new ViolationRiskEngine();

    private DealLine line(String unitPrice, int quantity, String discountPercent) {
        Product product = Product.builder()
                .sku("SKU-" + UUID.randomUUID())
                .name("Test Product")
                .listPrice(new BigDecimal(unitPrice))
                .standardCost(new BigDecimal("10.00"))
                .active(true)
                .build();

        return DealLine.builder()
                .id(UUID.randomUUID())
                .product(product)
                .quantity(quantity)
                .unitPrice(new BigDecimal(unitPrice))
                .discountPercent(new BigDecimal(discountPercent))
                .build();
    }

    private Deal dealOf(DealLine... lines) {
        Deal deal = Deal.builder().build();
        for (DealLine line : lines) {
            deal.addLine(line);
        }
        return deal;
    }

    private PolicyEngine.LineDiscountEvaluation compliant(DealLine line) {
        return new PolicyEngine.LineDiscountEvaluation(
                line.getId(), new BigDecimal("20"), line.getDiscountPercent(), BigDecimal.ZERO, true, null);
    }

    private PolicyEngine.LineDiscountEvaluation violating(DealLine line, String allowed, String overage, String reason) {
        BigDecimal allowedValue = new BigDecimal(allowed);
        BigDecimal overageValue = new BigDecimal(overage);
        return new PolicyEngine.LineDiscountEvaluation(
                line.getId(), allowedValue, allowedValue.add(overageValue), overageValue, false, reason);
    }

    @Test
    void compliantQuoteScoresZero() {
        DealLine line = line("1000.00", 1, "10");
        Deal deal = dealOf(line);

        ViolationRiskEngine.RiskResult result = engine.assess(deal, List.of(compliant(line)));

        assertThat(result.score()).isZero();
        assertThat(result.level()).isEqualTo(RiskLevel.LOW);
        assertThat(result.violations()).isEmpty();
        assertThat(result.reasons()).isEmpty();
        assertThat(result.requiredApprovalLevel()).isEqualTo(Role.SALES_REP);
    }

    @Test
    void oneViolatingLineWeightsByItsShareOfQuoteValue() {
        DealLine line = line("1000.00", 1, "18");
        Deal deal = dealOf(line);

        ViolationRiskEngine.RiskResult result = engine.assess(
                deal, List.of(violating(line, "10", "8", "SERVICE_DISCOUNT_EXCEEDED")));

        // Whole quote is this one line, so its value cancels out of the ratio:
        // weighted_violation = overageFraction = 0.08 -> score 8
        assertThat(result.score()).isEqualTo(8);
        assertThat(result.violations()).hasSize(1);
        assertThat(result.reasons()).containsExactly("SERVICE_DISCOUNT_EXCEEDED");
    }

    @Test
    void multipleViolatingLinesAggregate() {
        DealLine lineA = line("1000.00", 1, "18");
        DealLine lineB = line("1000.00", 1, "25");
        Deal deal = dealOf(lineA, lineB);

        ViolationRiskEngine.RiskResult result = engine.assess(deal, List.of(
                violating(lineA, "10", "8", "SERVICE_DISCOUNT_EXCEEDED"),
                violating(lineB, "10", "15", "HARDWARE_DISCOUNT_EXCEEDED")));

        assertThat(result.violations()).hasSize(2);
        assertThat(result.reasons()).containsExactlyInAnyOrder(
                "SERVICE_DISCOUNT_EXCEEDED", "HARDWARE_DISCOUNT_EXCEEDED");
        assertThat(result.score()).isGreaterThan(8); // worse than the single-line case above
    }

    @Test
    void highValueViolatingLineDominatesTheScore() {
        DealLine highValue = line("100000.00", 1, "18");
        DealLine lowValue = line("50.00", 1, "18");
        Deal deal = dealOf(highValue, lowValue);

        ViolationRiskEngine.RiskResult result = engine.assess(deal, List.of(
                violating(highValue, "10", "8", "SERVICE_DISCOUNT_EXCEEDED"),
                compliant(lowValue)));

        // Near-entirely driven by the high-value line: ~ same as if it were the whole quote.
        assertThat(result.score()).isBetween(7, 8);
    }

    @Test
    void smallDistributedViolationsStillProduceMeaningfulAggregateRisk() {
        DealLine[] lines = new DealLine[10];
        List<PolicyEngine.LineDiscountEvaluation> evaluations = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            lines[i] = line("100.00", 1, "11");
            evaluations.add(violating(lines[i], "10", "1", "DISCOUNT_LIMIT_EXCEEDED"));
        }
        Deal deal = dealOf(lines);

        ViolationRiskEngine.RiskResult result = engine.assess(deal, evaluations);

        assertThat(result.violations()).hasSize(10);
        // Every line breaches by the same 1pt, spread evenly -> blended score reflects that 1pt overage.
        assertThat(result.score()).isEqualTo(1);
        assertThat(result.level()).isEqualTo(RiskLevel.LOW);
    }

    @Test
    void zeroQuoteValueScoresZeroRatherThanDividingByZero() {
        DealLine line = line("100.00", 0, "50");
        Deal deal = dealOf(line);

        ViolationRiskEngine.RiskResult result = engine.assess(
                deal, List.of(violating(line, "10", "40", "DISCOUNT_LIMIT_EXCEEDED")));

        assertThat(result.score()).isZero();
        assertThat(result.level()).isEqualTo(RiskLevel.LOW);
    }

    @Test
    void criticalPatternRequiresAdminApproval() {
        DealLine line = line("1000.00", 1, "90");
        Deal deal = dealOf(line);

        ViolationRiskEngine.RiskResult result = engine.assess(
                deal, List.of(violating(line, "10", "80", "DISCOUNT_LIMIT_EXCEEDED")));

        assertThat(result.level()).isEqualTo(RiskLevel.CRITICAL);
        assertThat(result.requiredApprovalLevel()).isEqualTo(Role.ADMIN);
    }
}
