package com.dice.domain.enums;

/** How a violation is handled: soft ones warn, hard ones stop the deal. */
public enum PolicySeverity {
    /** Surfaced to the rep, never blocks. */
    ADVISORY,
    /** Routes the deal to an approver. */
    APPROVAL_REQUIRED,
    /** Non-negotiable floor. */
    BLOCKING
}
