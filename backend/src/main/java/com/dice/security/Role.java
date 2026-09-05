package com.dice.security;

/**
 * Authorisation roles. Approval policies name these in
 * {@code Policy.requiredRole}, so the string form is part of the data contract
 * — renaming a constant means migrating the policies table.
 *
 * <p>Ordered least to most authority; {@link #canApproveFor} relies on that.
 */
public enum Role {

    /** Reads only their own deals. */
    SALES_REP,
    /** Clears standard discount and margin escalations. */
    SALES_MANAGER,
    /** Clears credit and payment-term escalations. */
    FINANCE,
    /** Runs fulfillment; no pricing authority. */
    OPERATIONS,
    /** Clears anything, including BLOCKING overrides. */
    ADMIN,
    /** External customer contact, restricted to the portal. */
    CUSTOMER;

    /** Spring Security expects the {@code ROLE_} prefix on authorities. */
    public String authority() {
        return "ROLE_" + name();
    }

    /**
     * Whether a holder of this role can action an approval addressed to
     * {@code required}. ADMIN clears everything; CUSTOMER clears nothing.
     */
    public boolean canApproveFor(Role required) {
        if (this == ADMIN) {
            return true;
        }
        if (this == CUSTOMER || required == CUSTOMER) {
            return false;
        }
        return this == required;
    }

    public static Role fromAuthority(String authority) {
        String raw = authority.startsWith("ROLE_") ? authority.substring(5) : authority;
        return Role.valueOf(raw);
    }
}
