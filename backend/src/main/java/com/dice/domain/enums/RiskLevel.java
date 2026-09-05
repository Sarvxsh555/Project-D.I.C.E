package com.dice.domain.enums;

/** Ordered so that {@code compareTo} expresses severity. */
public enum RiskLevel {
    LOW,
    MODERATE,
    HIGH,
    CRITICAL;

    public boolean atLeast(RiskLevel other) {
        return this.compareTo(other) >= 0;
    }
}
