package com.dice.service.payment;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Deterministic stand-in for a real payment gateway. Any positive amount
 * succeeds; a non-positive amount fails — enough to exercise both branches of
 * {@code PaymentService} without a network call or randomness.
 */
@Component
public class MockPaymentProvider implements PaymentAdapter {

    @Override
    public AdapterResult charge(BigDecimal amount, String currency, String idempotencyKey) {
        if (amount == null || amount.signum() <= 0) {
            return AdapterResult.failure("Amount must be positive");
        }
        return AdapterResult.success("MOCK-" + idempotencyKey);
    }
}
