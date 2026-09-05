package com.dice.domain.enums;

import java.time.LocalDate;

/** Billing cadence for a {@code SubscriptionPlan}. */
public enum RecurringInterval {
    MONTHLY(1),
    QUARTERLY(3),
    ANNUAL(12);

    private final int months;

    RecurringInterval(int months) {
        this.months = months;
    }

    public LocalDate advance(LocalDate from) {
        return from.plusMonths(months);
    }
}
