package com.dice.controller;

import com.dice.config.DiceProperties;
import com.dice.integration.odoo.OdooEventAdapter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Receives events from Odoo — or from OEEG pretending to be Odoo.
 *
 * <p>Outside the JWT chain (see {@code SecurityConfig.PUBLIC_PATHS}) because the
 * caller is a machine with no user session. Authenticity comes from the
 * {@code X-Odoo-Signature} shared secret instead.
 */
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
public class OdooWebhookController {

    private static final String SIGNATURE_HEADER = "X-Odoo-Signature";

    private final OdooEventAdapter adapter;
    private final DiceProperties properties;

    @PostMapping("/odoo")
    public ResponseEntity<OdooEventAdapter.Result> receive(
            @RequestHeader(value = SIGNATURE_HEADER, required = false) String signature,
            @Valid @RequestBody EventEnvelope envelope) {

        if (!signatureValid(signature)) {
            log.warn("Rejected webhook with bad or missing signature (type={})", envelope.type());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        OdooEventAdapter.Result result = adapter.handle(
                envelope.type(),
                envelope.payload() == null ? Map.of() : envelope.payload());

        // A malformed payload is the caller's bug, so say so with a 400.
        return result.isRejected()
                ? ResponseEntity.badRequest().body(result)
                : ResponseEntity.ok(result);
    }

    /** Liveness probe for OEEG to confirm the endpoint before replaying a scenario. */
    @GetMapping("/odoo/ping")
    public Map<String, Object> ping() {
        return Map.of("status", "ok", "odooEnabled", properties.odoo().enabled());
    }

    /**
     * Constant-time comparison against the configured secret.
     *
     * <p>An empty configured secret disables the check — convenient for local
     * work, and the reason {@code ODOO_WEBHOOK_SECRET} is set in .env.example.
     */
    private boolean signatureValid(String provided) {
        String expected = properties.odoo().webhookSecret();
        if (expected == null || expected.isBlank()) {
            return true;
        }
        if (provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * @param type    one of {@code DealEvent.Type}
     * @param payload event-specific fields; see docs/event-contracts.md
     */
    public record EventEnvelope(
            @NotBlank String type,
            Map<String, Object> payload) {
    }
}
