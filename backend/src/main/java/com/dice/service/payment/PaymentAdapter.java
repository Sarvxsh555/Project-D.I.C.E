package com.dice.service.payment;

import java.math.BigDecimal;

/**
 * Boundary between {@code PaymentService} and whatever actually moves money.
 * The hackathon build only ever wires {@link MockPaymentProvider} behind
 * this — no real gateway — but callers depend on the interface, not the
 * implementation.
 */
public interface PaymentAdapter {

    /** Attempts to collect {@code amount}. Deterministic: no network, no randomness. */
    AdapterResult charge(BigDecimal amount, String currency, String idempotencyKey);

    record AdapterResult(boolean success, String transactionReference, String failureReason) {

        public static AdapterResult success(String transactionReference) {
            return new AdapterResult(true, transactionReference, null);
        }

        public static AdapterResult failure(String reason) {
            return new AdapterResult(false, null, reason);
        }
    }
}
