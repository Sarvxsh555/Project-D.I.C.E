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
    /**
     * The quote was already approved, but has genuinely changed since — never
     * produced by {@code DecisionResolver} itself (it can't tell "changed"
     * from "unchanged, re-evaluated again"), only applied downstream once
     * {@code DealService}'s {@code MaterialChangeDetector} confirms a real
     * drift from the last granted {@code ApprovalSnapshot}.
     */
    REAPPROVAL_REQUIRED,
    /** Clean on every check — safe to move toward an order. */
    ORDER_READY,
    /** A blocking breach, or a critical blended-risk pattern, that needs escalation. */
    DEAL_AT_RISK
}
