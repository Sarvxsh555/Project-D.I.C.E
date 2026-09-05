package com.dice.domain.enums;

/**
 * The DealFlow360 sequential sign-off chain for a quotation, separate from the
 * per-policy-violation roles {@code ApprovalEngine} already routes to.
 * Declaration order is the required order — {@link #values()} is the pipeline.
 */
public enum ApprovalLevel {
    SALES_MANAGER,
    FINANCE_OPERATIONS
}
