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
        Odoo odoo,
        Fulfillment fulfillment,
        Billing billing,
        Health health,
        Anomaly anomaly) {

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

    /** Deterministic weighting for the allocation engine's warehouse ranking. */
    public record Fulfillment(
            @DefaultValue("1.0") double availabilityWeight,
            @DefaultValue("1.0") double shippingCostWeight,
            @DefaultValue("0.25") double dispatchDaysWeight) {
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

    /** Configurable proration policy for a mid-cycle subscription/plan change. */
    public record Billing(Proration proration) {
        public record Proration(
                /** When true, unused time on the old plan is credited against the new charge. */
                @DefaultValue("true") boolean creditUnusedTime) {
        }
    }

    /** Thresholds and weights feeding the deal-health deductions beyond margin/risk/policy. */
    public record Health(
            @DefaultValue("14") int inactivityDays,
            @DefaultValue("15") int inactivityWeight,
            @DefaultValue("48") int approvalDelayHours,
            @DefaultValue("15") int approvalDelayWeight,
            @DefaultValue("20") int discountAnomalyWeight,
            @DefaultValue("7") int deliverySlippageDays,
            @DefaultValue("15") int deliverySlippageWeight,
            @DefaultValue("3") int negotiationCycleThreshold,
            @DefaultValue("10") int negotiationCycleWeight,
            @DefaultValue("70") int healthyThreshold,
            @DefaultValue("40") int atRiskThreshold) {
    }

    /** Rule-based discount anomaly detection — no ML. */
    public record Anomaly(
            @DefaultValue("1.5") double ratioThreshold) {
    }
}
