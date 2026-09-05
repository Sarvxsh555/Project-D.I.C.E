package com.dice.oeeg.events;

import java.math.BigDecimal;

/** TODO: emitted when a scenario simulates a discount edit on a quotation. */
public record DiscountChangedEvent(String dealId, BigDecimal discountPercent) {
}
