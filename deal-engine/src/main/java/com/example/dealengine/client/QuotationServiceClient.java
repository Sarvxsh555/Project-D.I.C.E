package com.example.dealengine.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/**
 * Talks to quotation-service on behalf of the caller, forwarding their bearer token.
 * quotation-service remains the single source of truth for live quote state - the Deal
 * Engine never writes to it, only reads, and snapshots what it reads.
 */
@Component
public class QuotationServiceClient {

    private final RestClient restClient;

    public QuotationServiceClient(@Value("${app.quotation-service.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public QuoteSnapshotDto fetchQuote(Long quotationId, String bearerToken) {
        return restClient.get()
                .uri("/quotations/{id}", quotationId)
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new ResponseStatusException(res.getStatusCode(), "quotation-service: quote not accessible");
                })
                .body(QuoteSnapshotDto.class);
    }
}
