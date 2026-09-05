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
        List<ScenarioStep> steps,
        List<String> manualSteps) {

    /**
     * @param type    an {@link com.dice.oeeg.events.EventType} name
     * @param payload event-specific fields; see docs/event-contracts.md
     * @param note    optional human-readable line logged before this step runs
     */
    public record ScenarioStep(String type, java.util.Map<String, Object> payload, String note) {
    }
}
