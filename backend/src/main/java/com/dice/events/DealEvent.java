package com.dice.events;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Something that happened to a deal, worth recording and reacting to.
 *
 * <p>Deliberately a single flat type rather than a class per event: the payload
 * shape varies by source (Odoo, the portal, the UI) and pinning it down here
 * would mean a code change every time a new field appears upstream. The typed
 * contracts live in {@code oeeg/events} on the producing side.
 *
 * @param type     see the {@code Type} constants; free-form so OEEG can emit new
 *                 kinds without a backend release
 * @param actor    username, or {@code odoo}/{@code system} for machine origins
 * @param payload  event-specific detail, serialised verbatim into the audit trail
 */
public record DealEvent(
        String type,
        UUID dealId,
        String actor,
        Map<String, Object> payload,
        Instant occurredAt) {

    /** Event types the backend itself raises or reacts to. */
    public static final class Type {
        public static final String DEAL_CREATED = "DEAL_CREATED";
        public static final String QUOTE_CREATED = "QUOTE_CREATED";
        public static final String DISCOUNT_CHANGED = "DISCOUNT_CHANGED";
        public static final String QUANTITY_CHANGED = "QUANTITY_CHANGED";
        public static final String COUNTER_OFFER = "COUNTER_OFFER";
        public static final String INVENTORY_CHANGED = "INVENTORY_CHANGED";
        public static final String APPROVAL_REQUESTED = "APPROVAL_REQUESTED";
        public static final String APPROVAL_GRANTED = "APPROVAL_GRANTED";
        public static final String APPROVAL_REJECTED = "APPROVAL_REJECTED";
        public static final String DEAL_EVALUATED = "DEAL_EVALUATED";
        public static final String DEAL_CONFIRMED = "DEAL_CONFIRMED";
        public static final String FULFILLMENT_PLANNED = "FULFILLMENT_PLANNED";
        public static final String INVOICE_DRAFTED = "INVOICE_DRAFTED";

        private Type() {
        }
    }

    public static DealEvent of(String type, UUID dealId, String actor, Map<String, Object> payload) {
        return new DealEvent(type, dealId, actor,
                payload == null ? Map.of() : Map.copyOf(payload), Instant.now());
    }

    public static DealEvent of(String type, UUID dealId, String actor) {
        return of(type, dealId, actor, Map.of());
    }

    /** True for events that should trigger a fresh evaluation of the deal. */
    public boolean isCommerciallySignificant() {
        return switch (type) {
            case Type.QUOTE_CREATED, Type.DISCOUNT_CHANGED, Type.QUANTITY_CHANGED,
                 Type.COUNTER_OFFER, Type.INVENTORY_CHANGED, Type.APPROVAL_GRANTED -> true;
            default -> false;
        };
    }
}
