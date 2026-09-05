package com.dice.oeeg.events;

/** TODO: emitted when a scenario simulates an approver decision arriving from Odoo. */
public record ApprovalGrantedEvent(String dealId, String approvedBy) {
}
