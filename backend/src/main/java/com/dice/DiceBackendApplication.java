package com.dice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * D.I.C.E — Deal Intelligence &amp; Compliance Engine.
 *
 * <p>A quotation arrives (from Odoo, the portal, or the UI), the engines in
 * {@code com.dice.engine} score it, and {@code DecisionResolver} says what
 * happens next. See docs/architecture.md.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class DiceBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DiceBackendApplication.class, args);
    }
}
