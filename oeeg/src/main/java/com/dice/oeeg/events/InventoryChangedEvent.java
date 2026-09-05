package com.dice.oeeg.events;

/** TODO: emitted when a scenario simulates a stock movement in Odoo. */
public record InventoryChangedEvent(Long odooProductId, Integer quantityOnHand) {
}
