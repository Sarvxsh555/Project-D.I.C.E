package com.example.quotation.service;

import com.example.quotation.model.GovernanceThreshold;
import com.example.quotation.repository.GovernanceThresholdRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Resolves D.I.C.E. policy numbers from the governance_threshold table, falling back to the
 * values the engine used when they were compiled-in constants. An empty (or unreachable)
 * table therefore reproduces the previous behaviour exactly - the table only ever overrides.
 *
 * Values are cached for a few seconds so a single evaluate() does not issue one query per
 * lookup, while an admin retune still takes effect without a restart.
 */
@Service
public class ThresholdConfig {

    public static final String AUTO_APPROVE_RISK = "auto_approve_risk";
    public static final String MARGIN_FLOOR = "margin_floor";
    public static final String DEAL_VALUE_FINANCE = "deal_value_finance";
    public static final String BLENDED_OVERAGE_FINANCE = "blended_overage_finance";
    public static final String ANOMALY_DISCOUNT = "anomaly_discount";
    public static final String AUDIT_BAND_WIDTH = "audit_band_width";
    public static final String CEILING_BRONZE = "ceiling_bronze";
    public static final String CEILING_SILVER = "ceiling_silver";
    public static final String CEILING_GOLD = "ceiling_gold";
    public static final String CEILING_PLATINUM = "ceiling_platinum";
    public static final String CEILING_DEFAULT = "ceiling_default";
    public static final String CEILING_SERVICE_CAP = "ceiling_service_cap";

    private static final Map<String, Double> DEFAULTS = Map.ofEntries(
            Map.entry(AUTO_APPROVE_RISK, 40.0),
            Map.entry(MARGIN_FLOOR, 20.0),
            Map.entry(DEAL_VALUE_FINANCE, 50_00_000.0),
            Map.entry(BLENDED_OVERAGE_FINANCE, 8.0),
            Map.entry(ANOMALY_DISCOUNT, 25.0),
            // Width of the "approve now, flag for post-hoc audit" band immediately below
            // the auto-approve line. 0 disables the band entirely.
            Map.entry(AUDIT_BAND_WIDTH, 10.0),
            Map.entry(CEILING_BRONZE, 5.0),
            Map.entry(CEILING_SILVER, 10.0),
            Map.entry(CEILING_GOLD, 15.0),
            Map.entry(CEILING_PLATINUM, 20.0),
            Map.entry(CEILING_DEFAULT, 10.0),
            Map.entry(CEILING_SERVICE_CAP, 10.0));

    private static final long CACHE_TTL_MS = 5_000;

    private final GovernanceThresholdRepository repository;

    private volatile Map<String, Double> cache = Map.of();
    private volatile long cachedAt = 0;

    public ThresholdConfig(GovernanceThresholdRepository repository) {
        this.repository = repository;
    }

    public double get(String key) {
        Double configured = snapshot().get(key);
        if (configured != null) return configured;
        Double fallback = DEFAULTS.get(key);
        if (fallback == null) {
            throw new IllegalArgumentException("Unknown governance threshold: " + key);
        }
        return fallback;
    }

    /** Every effective value (defaults with any DB overrides applied) for display/audit. */
    public Map<String, Double> effectiveValues() {
        Map<String, Double> merged = new HashMap<>(DEFAULTS);
        merged.putAll(snapshot());
        return merged;
    }

    private Map<String, Double> snapshot() {
        long now = System.currentTimeMillis();
        if (now - cachedAt < CACHE_TTL_MS) {
            return cache;
        }
        try {
            Map<String, Double> loaded = new HashMap<>();
            for (GovernanceThreshold row : repository.findAll()) {
                if (row.getKey() != null) loaded.put(row.getKey(), row.getValue());
            }
            cache = loaded;
        } catch (RuntimeException ex) {
            // Never let a config-table problem take the pricing engine down - defaults stand.
            cache = Map.of();
        }
        cachedAt = now;
        return cache;
    }
}
