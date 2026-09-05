package com.dice.domain.enums;

public enum ApprovalStatus {
    PENDING,
    APPROVED,
    REJECTED,
    ESCALATED,
    WITHDRAWN;

    public boolean isTerminal() {
        return this != PENDING && this != ESCALATED;
    }
}
