package com.dice.oeeg;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * OEEG — Odoo Event Emulation Gateway.
 *
 * <p>TODO: wire {@code args[0]} (a scenario name) to
 * {@code scenario.ScenarioRunner#run}, or expose scenario triggering over a
 * small REST endpoint instead of a CLI arg. See scenarios/ and
 * docs/demo-flow.md.
 */
@SpringBootApplication
public class DiceOeegApplication {

    public static void main(String[] args) {
        SpringApplication.run(DiceOeegApplication.class, args);
    }

    @Bean
    CommandLineRunner scenarioTrigger(com.dice.oeeg.scenario.ScenarioRunner scenarioRunner) {
        return args -> {
            if (args.length > 0) {
                scenarioRunner.run(args[0]);
            }
        };
    }
}
