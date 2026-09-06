package com.example.login.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Called once, right after a CUSTOMER signup, to create the linked Customer record in
 * quotation-service. Without this, a self-service signup produces a login with no
 * customerId and every quotation/order lookup fails.
 */
@Service
public class QuotationServiceClient {

    private final RestClient restClient;

    public QuotationServiceClient(@Value("${app.quotation-service.base-url}") String baseUrl) {
        this.restClient = RestClient.create(baseUrl);
    }

    @SuppressWarnings("unchecked")
    public Long selfRegisterCustomer(String bearerToken, String companyName, String email) {
        Map<String, Object> body = restClient.post()
                .uri("/customers/self-register")
                .header("Authorization", "Bearer " + bearerToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of("name", companyName, "email", email))
                .retrieve()
                .body(Map.class);
        return ((Number) body.get("id")).longValue();
    }
}
