package com.dice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.List;

/**
 * Everything DICE reads from the environment, in one place.
 *
 * <p>Binding follows Spring's relaxed rules, so
 * {@code DICE_SECURITY_JWT_SECRET} maps to {@code dice.security.jwt.secret}.
 * See {@code .env.example} for the full list.
 */
@ConfigurationProperties(prefix = "dice")
public record DiceProperties(
        Security security,
        Cors cors,
        Odoo odoo) {

    public record Security(Jwt jwt) {
        public record Jwt(
                /** HS256 key; must be at least 32 bytes or startup fails. */
                String secret,
                @DefaultValue("86400000") long expirationMs) {
        }
    }

    public record Cors(
            @DefaultValue("http://localhost:5173") List<String> allowedOrigins) {
    }

    public record Odoo(
            /** False runs the stack entirely off OEEG-generated events. */
            @DefaultValue("false") boolean enabled,
            @DefaultValue("http://localhost:8069") String url,
            @DefaultValue("odoo") String db,
            @DefaultValue("admin") String username,
            @DefaultValue("") String apiKey,
            /** Shared secret expected in the X-Odoo-Signature header. */
            @DefaultValue("") String webhookSecret) {
    }
}
