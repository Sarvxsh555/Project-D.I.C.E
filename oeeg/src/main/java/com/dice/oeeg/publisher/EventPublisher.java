package com.dice.oeeg.publisher;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * TODO: posts an assembled event envelope to the backend's webhook endpoint
 * (dice.oeeg.target-url), including the X-Odoo-Signature header.
 */
@Component
public class EventPublisher {

    private final RestClient restClient = RestClient.create();

    @Value("${dice.oeeg.target-url:http://localhost:8080/api/webhooks/odoo}")
    private String targetUrl;

    public void publish(Map<String, Object> envelope) {
        throw new UnsupportedOperationException("TODO: implement HTTP publish to " + targetUrl);
    }
}
