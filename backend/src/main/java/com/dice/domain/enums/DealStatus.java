package com.dice.domain.enums;

/** Lifecycle of a deal, from Odoo quotation through to a billed order. */
public enum DealStatus {
    DRAFT,
    UNDER_EVALUATION,
    PENDING_APPROVAL,
    APPROVED,
    REJECTED,
    IN_NEGOTIATION,
    CONFIRMED,
    FULFILLING,
    FULFILLED,
    INVOICED,
    CANCELLED
}
