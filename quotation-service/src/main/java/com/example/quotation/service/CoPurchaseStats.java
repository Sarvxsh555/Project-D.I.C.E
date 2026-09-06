package com.example.quotation.service;

import com.example.quotation.repository.CoPurchaseRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns raw quote history into a co-purchase confidence score: of all the quotes that
 * contained product A, what fraction also contained product B. That is a plain frequency
 * ratio - no model, no training - but unlike the seeded constant it improves on its own as
 * the catalogue and quote book grow.
 *
 * Results are cached briefly because a single recommendation request asks about every product
 * already in the cart.
 */
@Service
public class CoPurchaseStats {

    /** Pairs seen fewer times than this are treated as noise rather than a signal. */
    private static final long MIN_SUPPORT = 1;

    private static final long CACHE_TTL_MS = 60_000;

    private final CoPurchaseRepository repository;

    private final Map<Long, Snapshot> cache = new HashMap<>();

    public CoPurchaseStats(CoPurchaseRepository repository) {
        this.repository = repository;
    }

    /** Observed statistics for one anchor product, keyed by the co-purchased product id. */
    public record Observation(long pairCount, long anchorCount, double confidence) {}

    private record Snapshot(long builtAt, Map<Long, Observation> byProduct) {}

    public Map<Long, Observation> forProduct(Long productId) {
        if (productId == null) return Map.of();

        synchronized (cache) {
            Snapshot cached = cache.get(productId);
            if (cached != null && System.currentTimeMillis() - cached.builtAt() < CACHE_TTL_MS) {
                return cached.byProduct();
            }
        }

        Map<Long, Observation> observations = new HashMap<>();
        try {
            long anchorCount = repository.countQuotesContaining(productId);
            if (anchorCount > 0) {
                for (Object[] row : repository.findCoPurchaseCounts(productId)) {
                    if (row.length < 2 || row[0] == null || row[1] == null) continue;
                    Long otherId = ((Number) row[0]).longValue();
                    long pairCount = ((Number) row[1]).longValue();
                    if (pairCount < MIN_SUPPORT) continue;
                    double confidence = round3((double) pairCount / anchorCount);
                    observations.put(otherId, new Observation(pairCount, anchorCount, confidence));
                }
            }
        } catch (RuntimeException ex) {
            // History unavailable - callers fall back to the configured score.
            observations = Map.of();
        }

        synchronized (cache) {
            cache.put(productId, new Snapshot(System.currentTimeMillis(), observations));
        }
        return observations;
    }

    /** Convenience for callers that only need one pair. */
    public Observation observe(Long anchorProductId, Long otherProductId) {
        return forProduct(anchorProductId).get(otherProductId);
    }

    /** Discovered partners for an anchor product, strongest first. */
    public List<Map.Entry<Long, Observation>> rankedPartners(Long anchorProductId) {
        return forProduct(anchorProductId).entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue().confidence(), a.getValue().confidence()))
                .toList();
    }

    private static double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}
