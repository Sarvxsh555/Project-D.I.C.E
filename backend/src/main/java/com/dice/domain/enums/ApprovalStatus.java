package com.dice.domain.enums;

public enum ApprovalStatus {
    PENDING,
    APPROVED,
    REJECTED,
    /** Sent back to the rep for revision rather than cleared or refused outright. */
    RETURNED,
    ESCALATED,
    WITHDRAWN;

    public boolean isTerminal() {
        return this != PENDING && this != ESCALATED;
    }
}
