package com.dice.domain.enums;

/**
 * What should happen to a quotation right now, from {@code DecisionResolver}'s
 * blended view of policy, margin and risk. Deliberately silent on fulfillment
 * or billing — those decisions belong to their own engines once built.
 */
public enum QuotationDecision {
    /** Nothing to do — the quote isn't clean enough for ORDER_READY but nothing demands action either. */
    NO_ACTION,
    /** Policy violations need a first sign-off. */
    APPROVAL_REQUIRED,
    /** The quote was already approved (or confirmed), but has since drifted out of policy again. */
    REAPPROVAL_REQUIRED,
    /** Clean on every check — safe to move toward an order. */
    ORDER_READY,
    /** A blocking breach, or a critical blended-risk pattern, that needs escalation. */
    DEAL_AT_RISK
}
