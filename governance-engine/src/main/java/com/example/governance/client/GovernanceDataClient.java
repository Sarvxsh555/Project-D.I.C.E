package com.example.governance.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Pulls the inputs governance needs from the services that own them: the live quote and
 * catalog from quotation-service, and configured discount ceilings from the admin console
 * in login-service. Governance never duplicates that config locally - it reads it fresh
 * on every evaluation, so a policy change in the admin UI takes effect immediately.
 */
@Component
public class GovernanceDataClient {

    private final RestClient quotationServiceClient;
    private final RestClient loginServiceClient;

    public GovernanceDataClient(
            @Value("${app.quotation-service.base-url}") String quotationBaseUrl,
            @Value("${app.login-service.base-url}") String loginBaseUrl) {
        this.quotationServiceClient = RestClient.builder().baseUrl(quotationBaseUrl).build();
        this.loginServiceClient = RestClient.builder().baseUrl(loginBaseUrl).build();
    }

    public QuoteDto fetchQuote(Long quotationId, String bearerToken) {
        return quotationServiceClient.get()
                .uri("/quotations/{id}", quotationId)
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new ResponseStatusException(res.getStatusCode(), "quotation-service: quote not accessible");
                })
                .body(QuoteDto.class);
    }

    /**
     * Asks D.I.C.E. for the decision instead of recomputing it here. quotation-service owns
     * the scoring policy; governance-engine owns persistence, the approval chain and the
     * response contract that approval-engine consumes.
     */
    public DiceDecisionDto fetchDiceDecision(Long quotationId, String bearerToken) {
        return quotationServiceClient.get()
                .uri("/dice/quotes/{id}/decision", quotationId)
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new ResponseStatusException(res.getStatusCode(), "quotation-service: D.I.C.E. decision not accessible");
                })
                .body(DiceDecisionDto.class);
    }

    public List<CustomerDto> fetchCustomers(String bearerToken) {
        return quotationServiceClient.get()
                .uri("/customers")
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public List<ProductDto> fetchProducts(String bearerToken) {
        return quotationServiceClient.get()
                .uri("/products")
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public List<DiscountRuleDto> fetchDiscountRules(String bearerToken) {
        return loginServiceClient.get()
                .uri("/admin/discount-rules")
                .header("Authorization", "Bearer " + bearerToken)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }
}
