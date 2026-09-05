package com.dice.domain.enums;

/** Lifecycle of a single {@code NegotiationVersion}. */
public enum NegotiationVersionStatus {
    /** The current proposal on the table. */
    ACTIVE,
    /** Superseded by a later counter-offer; kept for history, never mutated. */
    SUPERSEDED,
    /** The customer confirmed the deal while this version was active. */
    ACCEPTED,
    /** The evaluation pipeline resolved this version's deal state to REJECTED. */
    REJECTED
}
