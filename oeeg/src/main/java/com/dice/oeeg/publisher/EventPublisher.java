package com.dice.oeeg.publisher;

import com.dice.oeeg.events.OutboundEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * Transmits an {@link OutboundEvent} to the backend's webhook endpoint.
 *
 * <p>The wire body is exactly {@code {type, payload}} — the envelope the
 * backend's {@code OdooWebhookController} accepts today. {@link OutboundEvent#generatedAt()}
 * is intentionally not sent; see docs/event-contracts.md for the v1/v2 split.
 *
 * <p>Every failure mode (backend down, 4xx, 5xx) is caught and returned as a
 * {@link PublishResult} rather than thrown — one bad step in a scenario should
 * not crash the whole replay.
 */
@Component
@Slf4j
public class EventPublisher {

    private static final String SIGNATURE_HEADER = "X-Odoo-Signature";

    private final RestClient restClient;
    private final String webhookSecret;

    public EventPublisher(
            @Value("${dice.oeeg.target-url:http://localhost:8080/api/webhooks/odoo}") String targetUrl,
            @Value("${dice.oeeg.webhook-secret:}") String webhookSecret) {
        this.restClient = RestClient.builder().baseUrl(targetUrl).build();
        this.webhookSecret = webhookSecret;
        log.info("OEEG publishing to {}", targetUrl);
    }

    public PublishResult publish(OutboundEvent event) {
        Map<String, Object> body = Map.of("type", event.type().name(), "payload", event.payload());

        try {
            var response = restClient.post()
                    .header(SIGNATURE_HEADER, webhookSecret)
                    .body(body)
                    .retrieve()
                    .toEntity(Map.class);

            HttpStatusCode status = response.getStatusCode();
            @SuppressWarnings("unchecked")
            Map<String, Object> responseBody = (Map<String, Object>) response.getBody();

            if (status.is2xxSuccessful()) {
                log.info("{} -> {} {}", event.type(), status.value(), responseBody);
                return PublishResult.success(status.value(), responseBody);
            }
            log.warn("{} -> {} {}", event.type(), status.value(), responseBody);
            return PublishResult.rejected(status.value(), responseBody);

        } catch (RestClientException e) {
            // Includes non-2xx thrown as exceptions by RestClient's default handler
            // (e.g. 401 from a bad signature, 400 from a malformed payload) as well
            // as the backend simply being unreachable.
            log.error("Failed to publish {}: {}", event.type(), e.getMessage());
            return PublishResult.failure(e.getMessage());
        }
    }

    /**
     * @param success true only on a 2xx response — a well-formed 4xx (e.g. the
     *                adapter's own REJECTED/IGNORED outcome) is not a transport
     *                failure and is reported via {@code responseBody} instead
     */
    public record PublishResult(boolean success, Integer httpStatus,
                                Map<String, Object> responseBody, String error) {

        static PublishResult success(int status, Map<String, Object> body) {
            return new PublishResult(true, status, body, null);
        }

        static PublishResult rejected(int status, Map<String, Object> body) {
            return new PublishResult(false, status, body, null);
        }

        static PublishResult failure(String error) {
            return new PublishResult(false, null, null, error);
        }
    }
}
