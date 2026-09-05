package com.dice.domain.enums;

/**
 * What the {@code DecisionResolver} concluded for a deal.
 *
 * <p>{@link #REAPPROVAL_REQUIRED} is never produced by {@code DecisionResolver}
 * itself — the resolver only ever looks at current state, and has no notion of
 * "previously approved." It is applied afterward, by {@code DealService}, when
 * a fresh evaluation's outcome would otherwise be {@link #AUTO_APPROVE} or
 * {@link #RECOMMEND_ALTERNATIVE} but {@code MaterialChangeDetector} finds the
 * deal has drifted from its last granted {@code ApprovalSnapshot}. It still has
 * to be a case here (not just a {@code DealService}-local concept) because it
 * is a real, persisted value of {@code Evaluation.outcome} / {@code Decision.outcome}.
 */
public enum DecisionOutcome {
    /** Everything within policy — no human in the loop. */
    AUTO_APPROVE,
    /** At least one policy needs a role-holder to sign off. */
    REQUIRE_APPROVAL,
    /** A hard floor was breached; the deal cannot proceed as configured. */
    BLOCK,
    /** Blocked, but the recommendation engine found viable alternatives. */
    RECOMMEND_ALTERNATIVE,
    /**
     * Policy alone would clear this deal, but it changed since a human last
     * approved it — the prior approval no longer covers the current state.
     */
    REAPPROVAL_REQUIRED
}
