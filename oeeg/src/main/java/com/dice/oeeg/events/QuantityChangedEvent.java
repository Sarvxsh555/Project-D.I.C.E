package com.dice.oeeg.events;

/** TODO: emitted when a scenario simulates a line quantity edit. */
public record QuantityChangedEvent(String dealId, String sku, Integer quantity) {
}
