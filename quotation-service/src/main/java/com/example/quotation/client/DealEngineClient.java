package com.example.quotation.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Called once a quotation reaches ORDERED so the deal/order actually gets created instead of
 * leaving those deal-engine endpoints orphaned. Forwards the acting user's own bearer token,
 * same trust model used everywhere else in this codebase.
 */
@Component
public class DealEngineClient {

    private final RestClient restClient;

    public DealEngineClient(@Value("${app.deal-engine.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public Long createDeal(Long quotationId, String bearerToken) {
        Map<?, ?> body = restClient.post()
                .uri("/deals")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of("quotationId", quotationId))
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new ResponseStatusException(res.getStatusCode(), "deal-engine: could not open deal");
                })
                .body(Map.class);
        return ((Number) body.get("id")).longValue();
    }

    public void convertToOrder(Long dealId, String bearerToken) {
        restClient.post()
                .uri("/deals/{id}/convert-to-order", dealId)
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new ResponseStatusException(res.getStatusCode(), "deal-engine: could not convert deal to order");
                })
                .toBodilessEntity();
    }
}
