package com.example.quotation.controller;

import com.example.quotation.service.DiceOdooIngestService;
import com.example.quotation.web.OdooWebhookRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks")
public class OdooWebhookController {

    private final DiceOdooIngestService ingest;
    private final String expectedKey;

    public OdooWebhookController(
            DiceOdooIngestService ingest,
            @Value("${dice.oeeg.webhook-key:oeeg-demo-key}") String expectedKey) {
        this.ingest = ingest;
        this.expectedKey = expectedKey;
    }

    @PostMapping("/odoo")
    public Map<String, Object> odoo(@RequestHeader(value = "X-OEEG-Key", required = false) String key,
                                     @RequestBody OdooWebhookRequest body) {
        if (expectedKey != null && !expectedKey.isBlank() && !expectedKey.equals(key)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid OEEG webhook key");
        }
        return ingest.ingest(body);
    }
}
