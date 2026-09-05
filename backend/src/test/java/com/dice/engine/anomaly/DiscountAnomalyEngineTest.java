package com.dice.engine.anomaly;

import com.dice.domain.enums.AnomalySeverity;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class DiscountAnomalyEngineTest {

    @Test
    void normalDiscountIsNotAnomalous() {
        var result = DiscountAnomalyEngine.evaluate(
                BigDecimal.valueOf(8), BigDecimal.valueOf(9), 1.5);

        assertThat(result).isEmpty();
    }

    @Test
    void exactlyAtThresholdIsNotAnomalous() {
        var result = DiscountAnomalyEngine.evaluate(
                BigDecimal.valueOf(10), BigDecimal.valueOf(15), 1.5);

        assertThat(result).isEmpty();
    }

    @Test
    void aboveThresholdIsAnomalous() {
        var result = DiscountAnomalyEngine.evaluate(
                BigDecimal.valueOf(8), BigDecimal.valueOf(16), 1.5);

        assertThat(result).isPresent();
        assertThat(result.get().ratio()).isEqualByComparingTo("2.000000");
        assertThat(result.get().baseline()).isEqualByComparingTo("8");
        assertThat(result.get().currentValue()).isEqualByComparingTo("16");
        assertThat(result.get().reason()).contains("2.00x");
    }

    @Test
    void zeroBaselineNeverAnomalous() {
        var result = DiscountAnomalyEngine.evaluate(BigDecimal.ZERO, BigDecimal.valueOf(50), 1.5);

        assertThat(result).isEmpty();
    }

    @Test
    void missingBaselineNeverAnomalous() {
        var result = DiscountAnomalyEngine.evaluate(null, BigDecimal.valueOf(50), 1.5);

        assertThat(result).isEmpty();
    }

    @Test
    void severityEscalatesWithDeviation() {
        var low = DiscountAnomalyEngine.evaluate(BigDecimal.valueOf(10), BigDecimal.valueOf(16), 1.5).orElseThrow();
        var high = DiscountAnomalyEngine.evaluate(BigDecimal.valueOf(10), BigDecimal.valueOf(50), 1.5).orElseThrow();

        assertThat(low.severity()).isEqualTo(AnomalySeverity.LOW);
        assertThat(high.severity()).isEqualTo(AnomalySeverity.HIGH);
    }
}
