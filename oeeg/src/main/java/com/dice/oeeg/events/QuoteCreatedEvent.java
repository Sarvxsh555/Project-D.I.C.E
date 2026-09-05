package com.dice.oeeg.events;

/**
 * TODO: fields mirroring an Odoo sale.order creation.
 * See docs/event-contracts.md for the wire shape this must produce.
 */
public record QuoteCreatedEvent(Long quotationId, Long partnerId) {
}
