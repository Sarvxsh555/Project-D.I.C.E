package com.dice.engine.billing;

import com.dice.config.DiceProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Deterministic mid-cycle subscription/plan-change proration.
 *
 * <p>Given the remaining days on the current billing period, works out the
 * unused credit on the old plan and the prorated charge for the new one.
 * Whether the credit actually offsets the new charge is a configured policy
 * ({@code dice.billing.proration.credit-unused-time}), not a hardcoded choice.
 */
@Component
@RequiredArgsConstructor
public class ProrationService {

    private final DiceProperties properties;

    /**
     * @param periodStart   start of the current billing period
     * @param periodEnd     end of the current billing period (exclusive of the next cycle)
     * @param changeDate    the day the plan change takes effect
     * @param oldPeriodPrice price for the full old-plan period
     * @param newPeriodPrice price for the full new-plan period
     */
    public ProrationResult calculate(LocalDate periodStart, LocalDate periodEnd, LocalDate changeDate,
                                     BigDecimal oldPeriodPrice, BigDecimal newPeriodPrice) {
        long totalDays = Math.max(1, ChronoUnit.DAYS.between(periodStart, periodEnd));
        long remainingDays = Math.max(0, ChronoUnit.DAYS.between(changeDate, periodEnd));
        BigDecimal remainingFraction = BigDecimal.valueOf(remainingDays)
                .divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);

        BigDecimal unusedCredit = oldPeriodPrice.multiply(remainingFraction)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal newPeriodCharge = newPeriodPrice.multiply(remainingFraction)
                .setScale(2, RoundingMode.HALF_UP);

        boolean applyCredit = properties.billing() == null
                || properties.billing().proration() == null
                || properties.billing().proration().creditUnusedTime();

        BigDecimal netAmount = applyCredit
                ? newPeriodCharge.subtract(unusedCredit).max(BigDecimal.ZERO)
                : newPeriodCharge;

        return new ProrationResult(unusedCredit, newPeriodCharge, netAmount, applyCredit);
    }

    public record ProrationResult(
            BigDecimal unusedCredit,
            BigDecimal proratedCharge,
            BigDecimal netAmount,
            boolean creditApplied) {
    }
}
