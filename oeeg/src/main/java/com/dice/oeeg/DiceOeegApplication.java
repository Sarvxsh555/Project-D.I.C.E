package com.dice.oeeg;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * OEEG — Odoo Event Emulation Gateway.
 *
 * <p>Run with a scenario name as the sole argument to replay it, e.g.
 * {@code ./mvnw spring-boot:run -Dspring-boot.run.arguments=complete-deal-flow}.
 * With no argument, boots and idles — useful once scenario triggering moves to
 * a REST endpoint for oeeg-frontend to drive instead of a CLI arg (not yet
 * built; see docs/demo-flow.md).
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
