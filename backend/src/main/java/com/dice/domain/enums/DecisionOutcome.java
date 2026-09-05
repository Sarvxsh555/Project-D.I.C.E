package com.dice.domain.enums;

/** What the {@code DecisionResolver} concluded for a deal. */
public enum DecisionOutcome {
    /** Everything within policy — no human in the loop. */
    AUTO_APPROVE,
    /** At least one policy needs a role-holder to sign off. */
    REQUIRE_APPROVAL,
    /** A hard floor was breached; the deal cannot proceed as configured. */
    BLOCK,
    /** Blocked, but the recommendation engine found viable alternatives. */
    RECOMMEND_ALTERNATIVE
}
