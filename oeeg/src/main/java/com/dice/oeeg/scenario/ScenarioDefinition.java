package com.dice.oeeg.scenario;

import java.util.List;

/**
 * The shape of a scenario JSON file under {@code oeeg/scenarios/}.
 *
 * <p>{@code manualSteps} is documentation only — narration for whoever is
 * running the demo about actions that happen outside OEEG (e.g. a manager
 * approving via the real Approvals UI). {@link ScenarioRunner} never acts on
 * it; it exists so the JSON file stays the single source of truth for how the
 * scenario is meant to be demoed, not just what it sends over the wire.
 */
public record ScenarioDefinition(
        String name,
        String description,
        /**
         * Optional. When present, {@link ScenarioRunner} creates a real deal
         * through DICE's own API before replaying {@link #steps}, and
         * substitutes its id for the literal token {@code "$SETUP_DEAL_ID"}
         * anywhere it appears in a step's payload. Null means the scenario
         * expects a deal to already exist (e.g. the smoke-test pattern of
         * pointing scenarios at a manually-created deal).
         */
        Setup setup,
        List<ScenarioStep> steps,
        List<String> manualSteps) {

    /**
     * @param type    an {@link com.dice.oeeg.events.EventType} name
     * @param payload event-specific fields; see docs/event-contracts.md.
     *                Use the literal string {@code "$SETUP_DEAL_ID"} for the
     *                deal created by {@link #setup}.
     * @param note    optional human-readable line logged before this step runs
     */
    public record ScenarioStep(String type, java.util.Map<String, Object> payload, String note) {
    }

    /**
     * @param customerName must match an active customer's name exactly (see
     *                      database/seed/customers.sql)
     * @param lines         one or more {@code {sku, quantity}} entries
     */
    public record Setup(String customerName, List<SetupLine> lines) {
    }

    /** @param sku must match an active product's SKU exactly */
    public record SetupLine(String sku, Integer quantity) {
    }
}
