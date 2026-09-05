package com.example.login.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class MailerClient {

    private final RestClient restClient;

    public MailerClient(@Value("${app.mailer.base-url}") String mailerBaseUrl) {
        this.restClient = RestClient.create(mailerBaseUrl);
    }

    public void sendResetEmail(String toEmail, String resetLink) {
        restClient.post()
                .uri("/send-reset-email")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(Map.of("to", toEmail, "resetLink", resetLink))
                .retrieve()
                .toBodilessEntity();
    }
}
