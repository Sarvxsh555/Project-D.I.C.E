package com.dice.oeeg.events;

import java.math.BigDecimal;

/** TODO: emitted when a scenario simulates a customer counter-offer. */
public record CounterOfferEvent(String dealId, BigDecimal requestedDiscountPercent) {
}
