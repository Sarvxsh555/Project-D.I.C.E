package com.dice.oeeg.scenario;

import org.springframework.stereotype.Component;

/**
 * TODO: loads a scenario JSON file from oeeg/scenarios/, walks its steps in
 * order, and publishes each as an event via publisher.EventPublisher, honoring
 * the configured emit delay between steps.
 */
@Component
public class ScenarioRunner {

    public void run(String scenarioName) {
        throw new UnsupportedOperationException("TODO: implement scenario replay for " + scenarioName);
    }
}
