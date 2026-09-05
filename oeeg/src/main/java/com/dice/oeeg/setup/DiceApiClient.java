package com.dice.oeeg.setup;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A small client against DICE's real REST API — used only to set up a
 * scenario's starting deal, never to emit the events themselves (that's
 * {@code publisher.EventPublisher}'s job, over the webhook boundary).
 *
 * <p>This is a deliberate, narrow exception to "OEEG only knows the external
 * event boundary": a scenario needs a real deal to act on, and DealFlow360 —
 * not Odoo — is what originates deals in the current architecture (see
 * docs/event-contracts.md, "Open question: quote origination"). Creating one
 * through the real, authenticated API is the honest way to get there — the
 * alternative was reaching into MySQL directly, which is worse. Once
 * quote origination is resolved, this may become unnecessary.
 */
@Component
@Slf4j
public class DiceApiClient {

    private final RestClient restClient;
    private final String username;
    private final String password;

    public DiceApiClient(
            @Value("${dice.oeeg.api-url:http://localhost:8080/api}") String apiUrl,
            @Value("${dice.oeeg.demo-username:sales_rep}") String username,
            @Value("${dice.oeeg.demo-password:dice-demo}") String password) {
        this.restClient = RestClient.builder().baseUrl(apiUrl).build();
        this.username = username;
        this.password = password;
    }

    /** Logs in as the configured demo user and returns a bearer token. */
    @SuppressWarnings("unchecked")
    public String login() {
        Map<String, Object> body = restClient.post()
                .uri("/auth/login")
                .body(Map.of("username", username, "password", password))
                .retrieve()
                .body(Map.class);
        if (body == null || body.get("token") == null) {
            throw new IllegalStateException("Login as '%s' returned no token".formatted(username));
        }
        return (String) body.get("token");
    }

    /** @throws IllegalStateException if no active customer matches {@code name} */
    @SuppressWarnings("unchecked")
    public UUID findCustomerByName(String token, String name) {
        List<Map<String, Object>> customers = restClient.get()
                .uri("/customers")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(List.class);

        return customers.stream()
                .filter(c -> name.equals(c.get("name")))
                .findFirst()
                .map(c -> UUID.fromString((String) c.get("id")))
                .orElseThrow(() -> new IllegalStateException(
                        "No active customer named '%s' — check database/mysql/seed.sql".formatted(name)));
    }

    /** @throws IllegalStateException if no active product matches {@code sku} */
    @SuppressWarnings("unchecked")
    public UUID findProductBySku(String token, String sku) {
        List<Map<String, Object>> products = restClient.get()
                .uri("/products")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(List.class);

        return products.stream()
                .filter(p -> sku.equals(p.get("sku")))
                .findFirst()
                .map(p -> UUID.fromString((String) p.get("id")))
                .orElseThrow(() -> new IllegalStateException(
                        "No active product with SKU '%s' — check database/mysql/seed.sql".formatted(sku)));
    }

    /** @return the created deal's id */
    @SuppressWarnings("unchecked")
    public UUID createDeal(String token, UUID customerId, List<Map<String, Object>> lines) {
        Map<String, Object> body = restClient.post()
                .uri("/deals")
                .header("Authorization", "Bearer " + token)
                .body(Map.of("customerId", customerId.toString(), "lines", lines))
                .retrieve()
                .body(Map.class);
        if (body == null || body.get("id") == null) {
            throw new IllegalStateException("Deal creation returned no id");
        }
        UUID dealId = UUID.fromString((String) body.get("id"));
        log.info("Created deal {} ({}) for scenario setup", body.get("dealNumber"), dealId);
        return dealId;
    }
}
