package com.dice.oeeg.events;

import java.util.Set;

/**
 * The whitelist of event types OEEG is allowed to emit.
 *
 * <p>This is deliberately a strict subset of what a real Odoo instance might
 * eventually send — it is exactly the set that {@code OdooEventAdapter} on the
 * backend actually routes today (see backend {@code com.dice.events.DealEvent.Type}
 * and {@code com.dice.integration.odoo.OdooEventAdapter#handle}). Anything not
 * listed here has no handler and would silently come back {@code IGNORED}.
 *
 * <p>Deliberately does <em>not</em> include {@code APPROVAL_GRANTED}: granting
 * an approval is a DICE/DealFlow360-internal decision made by a human through
 * the Approvals UI (a JWT-authenticated call), not a fact an external system
 * like Odoo would push in. OEEG simulating that inbound would blur exactly the
 * line the architecture is built to keep sharp — OEEG generates events, DICE
 * generates decisions.
 *
 * <p>Renaming or extending this list is an integration-boundary contract
 * change — see docs/event-contracts.md — not a local OEEG decision.
 */
public enum EventType {

    QUOTE_CREATED(Set.of("quotationId", "partnerId")),
    DISCOUNT_CHANGED(Set.of("discountPercent")),
    QUANTITY_CHANGED(Set.of()),
    COUNTER_OFFER(Set.of("requestedDiscountPercent")),
    INVENTORY_CHANGED(Set.of("odooProductId", "quantityOnHand"));

    private final Set<String> requiredPayloadFields;

    EventType(Set<String> requiredPayloadFields) {
        this.requiredPayloadFields = requiredPayloadFields;
    }

    /**
     * Fields every payload for this type must carry, on top of the identity
     * fields ({@code dealId} or {@code quotationId}) that {@code PayloadBuilder}
     * checks separately since either one satisfies identity.
     */
    public Set<String> requiredPayloadFields() {
        return requiredPayloadFields;
    }

    /**
     * @throws IllegalArgumentException if {@code raw} is not an OEEG-emittable type,
     *         naming the whitelist so a typo in scenario JSON fails loudly and early
     */
    public static EventType fromWireName(String raw) {
        try {
            return EventType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "'%s' is not an OEEG-emittable event type. Allowed: %s"
                            .formatted(raw, java.util.Arrays.toString(EventType.values())));
        }
    }
}
