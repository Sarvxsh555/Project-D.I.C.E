package com.dice.oeeg.generator;

import org.springframework.stereotype.Component;

/**
 * TODO: generates synthetic event payloads (random or templated) for load
 * testing / demo variety, independent of the fixed scenarios in scenarios/.
 */
@Component
public class EventGenerator {

    public Object generateRandomEvent() {
        throw new UnsupportedOperationException("TODO: implement event generation");
    }
}
