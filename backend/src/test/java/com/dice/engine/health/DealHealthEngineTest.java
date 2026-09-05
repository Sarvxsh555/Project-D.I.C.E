package com.dice.engine.health;

import com.dice.config.DiceProperties;
import com.dice.domain.Deal;
import com.dice.domain.enums.HealthStatus;
import com.dice.domain.enums.RiskLevel;
import com.dice.engine.margin.MarginEngine;
import com.dice.engine.policy.PolicyEngine;
import com.dice.engine.risk.RiskEngine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Commit 22 — deal health scoring, including the new inactivity/approval/anomaly/delivery/negotiation signals. */
class DealHealthEngineTest {

    private final DealHealthEngine engine = new DealHealthEngine();

    private MarginEngine.MarginResult healthyMargin() {
        return new MarginEngine.MarginResult(BigDecimal.valueOf(1000), BigDecimal.valueOf(600),
                BigDecimal.valueOf(1000), BigDecimal.valueOf(400), BigDecimal.valueOf(40), List.of());
    }

    private RiskEngine.RiskAssessment lowRisk() {
        return new RiskEngine.RiskAssessment(0, RiskLevel.LOW, List.of());
    }

    private PolicyEngine.PolicyReport cleanPolicies() {
        return new PolicyEngine.PolicyReport(List.of(), List.of());
    }

    @Test
    void healthyDealWithNoSignalsScoresPerfect() {
        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies());

        assertThat(score.score()).isEqualTo(100);
        assertThat(score.status()).isEqualTo(HealthStatus.HEALTHY);
        assertThat(score.deductions()).isEmpty();
    }

    @Test
    void inactivityBelowThresholdDoesNotDeduct() {
        var signals = new DealHealthEngine.HealthSignals(5, 0, false, null, 0, 0);
        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(score.score()).isEqualTo(100);
    }

    @Test
    void inactivityAboveThresholdDeductsAndExplains() {
        var signals = new DealHealthEngine.HealthSignals(30, 0, false, null, 0, 0);
        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(score.score()).isLessThan(100);
        assertThat(score.reasons()).anyMatch(r -> r.contains("30 days"));
    }

    @Test
    void approvalDelayContributes() {
        var signals = new DealHealthEngine.HealthSignals(0, 96, false, null, 0, 0);
        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(score.deductions()).anyMatch(d -> d.code().equals("APPROVAL_DELAY"));
    }

    @Test
    void discountAnomalyContributesWithReason() {
        var signals = new DealHealthEngine.HealthSignals(0, 0, true, "discount spiked", 0, 0);
        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(score.deductions()).anyMatch(d -> d.code().equals("DISCOUNT_ANOMALY")
                && d.explanation().contains("discount spiked"));
    }

    @Test
    void deliverySlippageContributes() {
        var signals = new DealHealthEngine.HealthSignals(0, 0, false, null, 10, 0);
        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(score.deductions()).anyMatch(d -> d.code().equals("DELIVERY_SLIPPAGE"));
    }

    @Test
    void negotiationCyclesContribute() {
        var signals = new DealHealthEngine.HealthSignals(0, 0, false, null, 0, 5);
        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(score.deductions()).anyMatch(d -> d.code().equals("NEGOTIATION_CYCLES"));
    }

    @Test
    void criticalDealCombinesAllSignals() {
        var signals = new DealHealthEngine.HealthSignals(60, 200, true, "huge spike", 30, 10);
        RiskEngine.RiskAssessment highRisk = new RiskEngine.RiskAssessment(90, RiskLevel.HIGH, List.of());
        MarginEngine.MarginResult poorMargin = new MarginEngine.MarginResult(
                BigDecimal.valueOf(1000), BigDecimal.valueOf(980), BigDecimal.valueOf(1000),
                BigDecimal.valueOf(20), BigDecimal.valueOf(2), List.of());

        DealHealthEngine.HealthScore score = engine.score(Deal.builder().build(),
                poorMargin, highRisk, cleanPolicies(), signals);

        assertThat(score.status()).isEqualTo(HealthStatus.CRITICAL);
        assertThat(score.score()).isEqualTo(0);
    }

    @Test
    void scoringIsDeterministicForIdenticalInputs() {
        var signals = new DealHealthEngine.HealthSignals(20, 60, true, "x", 5, 4);
        DealHealthEngine.HealthScore first = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);
        DealHealthEngine.HealthScore second = engine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(first.score()).isEqualTo(second.score());
        assertThat(first.status()).isEqualTo(second.status());
    }

    @Test
    void configurableThresholdsChangeWhatCountsAsAtRisk() {
        DiceProperties.Health strict = new DiceProperties.Health(1, 50, 1, 50, 50, 1, 50, 1, 50, 90, 40);
        DealHealthEngine strictEngine = new DealHealthEngine(
                new DiceProperties(null, null, null, null, null, strict, null));

        var signals = new DealHealthEngine.HealthSignals(2, 0, false, null, 0, 0);
        DealHealthEngine.HealthScore score = strictEngine.score(Deal.builder().build(),
                healthyMargin(), lowRisk(), cleanPolicies(), signals);

        assertThat(score.score()).isEqualTo(50);
        assertThat(score.status()).isEqualTo(HealthStatus.AT_RISK);
    }
}
