package com.dice.oeeg.payload;

import com.dice.oeeg.events.*;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns a typed event record into the {@code Map<String,Object>} payload shape
 * the backend webhook expects, and validates a raw (JSON-scenario-supplied)
 * payload before it is sent.
 *
 * <p>Validation here is deliberately shallow — required-field presence only,
 * not business rules. Anything resembling "is this discount allowed" is DICE's
 * job on the other side of the wire; OEEG must not contain that logic.
 */
@Component
public class PayloadBuilder {

    public Map<String, Object> build(QuoteCreatedEvent event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("quotationId", event.quotationId());
        payload.put("partnerId", event.partnerId());
        return payload;
    }

    public Map<String, Object> build(DiscountChangedEvent event) {
        Map<String, Object> payload = identityPayload(event.dealId());
        payload.put("discountPercent", event.discountPercent());
        return payload;
    }

    public Map<String, Object> build(QuantityChangedEvent event) {
        Map<String, Object> payload = identityPayload(event.dealId());
        payload.put("sku", event.sku());
        payload.put("quantity", event.quantity());
        return payload;
    }

    public Map<String, Object> build(CounterOfferEvent event) {
        Map<String, Object> payload = identityPayload(event.dealId());
        payload.put("requestedDiscountPercent", event.requestedDiscountPercent());
        return payload;
    }

    public Map<String, Object> build(InventoryChangedEvent event) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("odooProductId", event.odooProductId());
        payload.put("quantityOnHand", event.quantityOnHand());
        return payload;
    }

    /**
     * A value that looks like a UUID is treated as {@code dealId}; anything else
     * (a bare deal reference) is sent as {@code quotationId} instead — mirrors
     * {@code OdooEventAdapter.withDeal}'s dual lookup on the backend.
     */
    private Map<String, Object> identityPayload(String dealIdOrQuotationRef) {
        Map<String, Object> payload = new HashMap<>();
        if (dealIdOrQuotationRef != null) {
            payload.put("dealId", dealIdOrQuotationRef);
        }
        return payload;
    }

    /**
     * Checks a raw scenario-supplied payload has an identity field
     * ({@code dealId} or {@code quotationId}) plus everything {@link EventType#requiredPayloadFields()}
     * demands, for every type except {@code QUOTE_CREATED} and {@code INVENTORY_CHANGED}
     * which don't refer to an existing deal by identity.
     *
     * @throws IllegalArgumentException naming every missing field, so a scenario
     *         authoring mistake fails before a network call is made, not after
     */
    public void validate(EventType type, Map<String, Object> payload) {
        List<String> missing = new java.util.ArrayList<>();

        boolean needsDealIdentity = type != EventType.QUOTE_CREATED && type != EventType.INVENTORY_CHANGED;
        if (needsDealIdentity && !payload.containsKey("dealId") && !payload.containsKey("quotationId")) {
            missing.add("dealId (or quotationId)");
        }

        for (String field : type.requiredPayloadFields()) {
            if (!payload.containsKey(field)) {
                missing.add(field);
            }
        }

        if (!missing.isEmpty()) {
            throw new IllegalArgumentException(
                    "Payload for %s is missing required field(s): %s".formatted(type, missing));
        }
    }
}
