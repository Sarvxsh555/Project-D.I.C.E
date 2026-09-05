package com.dice.domain.enums;

/**
 * Server-controlled payment lifecycle. Only {@code PaymentService} may move a
 * payment between these states — never a client-supplied value.
 */
public enum PaymentStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
    REFUNDED;

    /** Whether {@code target} is a legal transition from this state. */
    public boolean canTransitionTo(PaymentStatus target) {
        return switch (this) {
            case PENDING -> target == PROCESSING || target == FAILED;
            case PROCESSING -> target == SUCCESS || target == FAILED;
            case SUCCESS -> target == REFUNDED;
            case FAILED, REFUNDED -> false;
        };
    }
}
