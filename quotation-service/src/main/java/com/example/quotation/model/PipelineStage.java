package com.example.quotation.model;

import java.util.Map;
import java.util.Set;

/**
 * Canonical quotation lifecycle. Transition legality lives here, not in the frontend -
 * the Kanban only ever asks the backend to move a card, and the backend can refuse.
 */
public enum PipelineStage {
    DRAFT,
    PENDING_APPROVAL,
    NEGOTIATION,
    APPROVED,
    ORDERED,
    FULFILLMENT,
    COMPLETED;

    private static final Map<PipelineStage, Set<PipelineStage>> ALLOWED_TRANSITIONS = Map.of(
            DRAFT, Set.of(PENDING_APPROVAL),
            PENDING_APPROVAL, Set.of(NEGOTIATION, APPROVED, DRAFT),
            NEGOTIATION, Set.of(PENDING_APPROVAL, APPROVED),
            APPROVED, Set.of(ORDERED),
            ORDERED, Set.of(FULFILLMENT),
            FULFILLMENT, Set.of(COMPLETED),
            COMPLETED, Set.of());

    public boolean canTransitionTo(PipelineStage target) {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }
}
