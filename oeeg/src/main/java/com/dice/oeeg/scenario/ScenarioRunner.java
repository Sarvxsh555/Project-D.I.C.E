package com.dice.oeeg.scenario;

import com.dice.oeeg.events.OutboundEvent;
import com.dice.oeeg.generator.EventGenerator;
import com.dice.oeeg.publisher.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;

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

    private final EventGenerator eventGenerator;
    private final EventPublisher eventPublisher;
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

        int succeeded = 0;
        int failed = 0;

        for (int i = 0; i < scenario.steps().size(); i++) {
            ScenarioDefinition.ScenarioStep step = scenario.steps().get(i);
            log.info("--- Step {}/{}: {}{}",
                    i + 1, scenario.steps().size(), step.type(),
                    step.note() == null ? "" : " (" + step.note() + ")");

            if (runStep(step)) {
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

    /** @return true if the step was generated and published without error */
    private boolean runStep(ScenarioDefinition.ScenarioStep step) {
        OutboundEvent event;
        try {
            event = eventGenerator.generate(step.type(), step.payload());
        } catch (IllegalArgumentException e) {
            log.error("Skipping step: {}", e.getMessage());
            return false;
        }

        EventPublisher.PublishResult result = eventPublisher.publish(event);
        return result.success();
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
