package com.dice.engine.billing;

import com.dice.config.DiceProperties;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ProrationServiceTest {

    private ProrationService serviceWithCreditPolicy(boolean creditUnusedTime) {
        DiceProperties.Billing billing = new DiceProperties.Billing(
                new DiceProperties.Billing.Proration(creditUnusedTime));
        return new ProrationService(new DiceProperties(null, null, null, null, billing, null, null));
    }

    @Test
    void halfwayThroughPeriodCreditsHalfTheOldPlan() {
        ProrationService service = serviceWithCreditPolicy(true);
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 2, 1); // 31 days
        LocalDate changeDate = LocalDate.of(2026, 1, 17); // 15 days remaining

        var result = service.calculate(start, end, changeDate,
                BigDecimal.valueOf(310), BigDecimal.valueOf(620));

        assertThat(result.unusedCredit()).isEqualByComparingTo("150.00");
        assertThat(result.proratedCharge()).isEqualByComparingTo("300.00");
        assertThat(result.netAmount()).isEqualByComparingTo("150.00");
    }

    @Test
    void policyDisablingCreditChargesFullProratedAmount() {
        ProrationService service = serviceWithCreditPolicy(false);
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 2, 1);
        LocalDate changeDate = LocalDate.of(2026, 1, 17);

        var result = service.calculate(start, end, changeDate,
                BigDecimal.valueOf(310), BigDecimal.valueOf(620));

        assertThat(result.creditApplied()).isFalse();
        assertThat(result.netAmount()).isEqualByComparingTo(result.proratedCharge());
    }

    @Test
    void changeOnTheLastDayHasNoRemainingValue() {
        ProrationService service = serviceWithCreditPolicy(true);
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 2, 1);

        var result = service.calculate(start, end, end, BigDecimal.valueOf(310), BigDecimal.valueOf(620));

        assertThat(result.unusedCredit()).isEqualByComparingTo("0.00");
        assertThat(result.proratedCharge()).isEqualByComparingTo("0.00");
        assertThat(result.netAmount()).isEqualByComparingTo("0.00");
    }

    @Test
    void netAmountNeverGoesNegativeWhenCreditExceedsNewCharge() {
        ProrationService service = serviceWithCreditPolicy(true);
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 2, 1);
        LocalDate changeDate = LocalDate.of(2026, 1, 2);

        var result = service.calculate(start, end, changeDate,
                BigDecimal.valueOf(1000), BigDecimal.valueOf(10));

        assertThat(result.netAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void calculationIsDeterministic() {
        ProrationService service = serviceWithCreditPolicy(true);
        LocalDate start = LocalDate.of(2026, 3, 1);
        LocalDate end = LocalDate.of(2026, 4, 1);
        LocalDate changeDate = LocalDate.of(2026, 3, 10);

        var first = service.calculate(start, end, changeDate, BigDecimal.valueOf(300), BigDecimal.valueOf(450));
        var second = service.calculate(start, end, changeDate, BigDecimal.valueOf(300), BigDecimal.valueOf(450));

        assertThat(first).isEqualTo(second);
    }
}
