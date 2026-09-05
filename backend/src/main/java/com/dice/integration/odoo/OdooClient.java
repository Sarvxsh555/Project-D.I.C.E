package com.dice.integration.odoo;

import com.dice.config.DiceProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Outbound calls to Odoo over its JSON-RPC endpoint.
 *
 * <p>Every method is a no-op returning empty when {@code dice.odoo.enabled} is
 * false, which is how the demo runs entirely off OEEG-generated events without
 * an Odoo instance anywhere in sight. Check {@link #isEnabled()} before relying
 * on a result.
 */
@Component
@Slf4j
public class OdooClient {

    private static final String JSONRPC_PATH = "/jsonrpc";

    private final DiceProperties.Odoo config;
    private final RestClient restClient;

    public OdooClient(DiceProperties properties) {
        this.config = properties.odoo();
        this.restClient = RestClient.builder()
                .baseUrl(config.url())
                .build();

        if (!config.enabled()) {
            log.info("Odoo integration disabled — running on emulated events only");
        }
    }

    public boolean isEnabled() {
        return config.enabled();
    }

    /** Reads one record's fields. Empty when disabled or the call fails. */
    public Optional<Map<String, Object>> read(String model, long id, List<String> fields) {
        return callKw(model, "read", List.of(List.of(id), fields))
                .filter(result -> result instanceof List<?> list && !list.isEmpty())
                .map(result -> {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> first = (Map<String, Object>) ((List<?>) result).get(0);
                    return first;
                });
    }

    /** Writes fields back to a record; false when disabled or the call fails. */
    public boolean write(String model, long id, Map<String, Object> values) {
        return callKw(model, "write", List.of(List.of(id), values))
                .map(Boolean.TRUE::equals)
                .orElse(false);
    }

    /**
     * Pushes a DICE decision onto the Odoo quotation so the two systems agree.
     * Silently skipped when the integration is off.
     */
    public boolean postDecision(long quotationId, String outcome, String rationale) {
        return write("sale.order", quotationId, Map.of(
                "x_dice_outcome", outcome,
                "x_dice_rationale", rationale));
    }

    /**
     * The single place a JSON-RPC call is made. Failures are logged and folded
     * into {@code Optional.empty()} — an Odoo outage must not take DICE down
     * with it, since the engines work perfectly well on local state.
     */
    private Optional<Object> callKw(String model, String method, List<Object> args) {
        if (!config.enabled()) {
            log.debug("Skipping Odoo {}.{} — integration disabled", model, method);
            return Optional.empty();
        }

        Map<String, Object> body = Map.of(
                "jsonrpc", "2.0",
                "method", "call",
                "id", System.nanoTime(),
                "params", Map.of(
                        "service", "object",
                        "method", "execute_kw",
                        "args", List.of(config.db(), config.username(), config.apiKey(),
                                model, method, args)));

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(JSONRPC_PATH)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                return Optional.empty();
            }
            if (response.containsKey("error")) {
                log.warn("Odoo returned an error for {}.{}: {}", model, method, response.get("error"));
                return Optional.empty();
            }
            return Optional.ofNullable(response.get("result"));
        } catch (RestClientException e) {
            log.warn("Odoo call {}.{} failed: {}", model, method, e.getMessage());
            return Optional.empty();
        }
    }
}
