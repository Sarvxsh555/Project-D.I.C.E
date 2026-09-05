package com.dice.oeeg.scenario;

import com.dice.oeeg.events.OutboundEvent;
import com.dice.oeeg.generator.EventGenerator;
import com.dice.oeeg.publisher.EventPublisher;
import com.dice.oeeg.setup.DiceApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Loads a scenario JSON file and replays its steps against the backend webhook,
 * in order, with a configurable delay between them.
 *
 * <p>Scenarios live on the filesystem (not the classpath) at {@code dice.oeeg.scenarios-dir}
 * — {@code scenarios/} relative to the working directory, which is true both for
 * {@code mvn spring-boot:run} from {@code oeeg/} and for the Docker image, which
 * {@code COPY}s the directory to {@code /app/scenarios} alongside the jar.
 *
 * <p>A single bad step (a validation failure, a rejected/failed publish) is
 * logged and the run continues — a scenario is a demo narrative, and one
 * hiccup shouldn't hide how the rest of it behaves.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScenarioRunner {

    /** Substitute this literal token in a step's payload for the deal {@link #runSetup} creates. */
    private static final String SETUP_DEAL_ID_TOKEN = "$SETUP_DEAL_ID";

    private final EventGenerator eventGenerator;
    private final EventPublisher eventPublisher;
    private final DiceApiClient diceApiClient;
    private final ObjectMapper objectMapper;

    @Value("${dice.oeeg.scenarios-dir:scenarios}")
    private String scenariosDir;

    @Value("${dice.oeeg.emit-delay-ms:750}")
    private long emitDelayMs;

    public void run(String scenarioName) {
        ScenarioDefinition scenario = load(scenarioName);

        log.info("=== Running scenario '{}': {} ===", scenario.name(), scenario.description());
        if (scenario.manualSteps() != null && !scenario.manualSteps().isEmpty()) {
            log.info("This scenario has manual step(s) outside OEEG's scope:");
            scenario.manualSteps().forEach(step -> log.info("  - {}", step));
        }

        UUID setupDealId = null;
        if (scenario.setup() != null) {
            try {
                setupDealId = runSetup(scenario.setup());
            } catch (RuntimeException e) {
                log.error("Scenario setup failed, aborting before any events are sent: {}", e.getMessage());
                return;
            }
        }

        int succeeded = 0;
        int failed = 0;

        for (int i = 0; i < scenario.steps().size(); i++) {
            ScenarioDefinition.ScenarioStep step = scenario.steps().get(i);
            log.info("--- Step {}/{}: {}{}",
                    i + 1, scenario.steps().size(), step.type(),
                    step.note() == null ? "" : " (" + step.note() + ")");

            if (runStep(step, setupDealId)) {
                succeeded++;
            } else {
                failed++;
            }

            if (i < scenario.steps().size() - 1) {
                sleep(emitDelayMs);
            }
        }

        log.info("=== Scenario '{}' complete: {} succeeded, {} failed ===",
                scenario.name(), succeeded, failed);
    }

    /**
     * Creates the scenario's starting deal through the real DICE API — not an
     * emitted event, see {@link DiceApiClient}'s class doc for why this is a
     * deliberate, narrow exception to OEEG only speaking the webhook boundary.
     */
    private UUID runSetup(ScenarioDefinition.Setup setup) {
        log.info("--- Setup: creating a deal for {} ---", setup.customerName());
        String token = diceApiClient.login();
        UUID customerId = diceApiClient.findCustomerByName(token, setup.customerName());

        List<Map<String, Object>> lines = setup.lines().stream()
                .<Map<String, Object>>map(line -> Map.of(
                        "productId", diceApiClient.findProductBySku(token, line.sku()).toString(),
                        "quantity", line.quantity()))
                .toList();

        UUID dealId = diceApiClient.createDeal(token, customerId, lines);
        log.info("Setup complete: deal {} ready for scenario steps", dealId);
        return dealId;
    }

    /** @return true if the step was generated and published without error */
    private boolean runStep(ScenarioDefinition.ScenarioStep step, UUID setupDealId) {
        OutboundEvent event;
        try {
            event = eventGenerator.generate(step.type(), substituteDealId(step.payload(), setupDealId));
        } catch (IllegalArgumentException e) {
            log.error("Skipping step: {}", e.getMessage());
            return false;
        }

        EventPublisher.PublishResult result = eventPublisher.publish(event);
        return result.success();
    }

    /** Replaces {@link #SETUP_DEAL_ID_TOKEN} with the real id from {@link #runSetup}, if any. */
    private Map<String, Object> substituteDealId(Map<String, Object> payload, UUID setupDealId) {
        if (setupDealId == null || payload == null) {
            return payload;
        }
        Map<String, Object> substituted = new HashMap<>();
        payload.forEach((key, value) -> substituted.put(key,
                SETUP_DEAL_ID_TOKEN.equals(value) ? setupDealId.toString() : value));
        return substituted;
    }

    private ScenarioDefinition load(String scenarioName) {
        Path path = Path.of(scenariosDir, scenarioName + ".json");
        if (!Files.exists(path)) {
            throw new IllegalArgumentException(
                    "No scenario file at %s (looked relative to working directory %s)"
                            .formatted(path, Path.of("").toAbsolutePath()));
        }
        try {
            return objectMapper.readValue(path.toFile(), ScenarioDefinition.class);
        } catch (JacksonException e) {
            throw new IllegalStateException("Could not parse scenario file " + path, e);
        }
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
