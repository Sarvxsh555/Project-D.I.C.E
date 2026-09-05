package com.dice.domain;

import java.math.BigDecimal;

/**
 * A single product recommendation produced by the co-purchase engine.
 *
 * <p>All fields are computed server-side. The frontend must not recompute or
 * override score, marginDelta, or promotion.
 *
 * @param productSku  Recommended product's SKU.
 * @param productName Display name.
 * @param score       Deterministic ranking score (higher is better). Same input → same score.
 * @param reason      Human-readable explanation for the recommendation.
 * @param marginDelta Estimated additional margin contribution if this product is added.
 *                    Positive = deal margin improves.
 * @param promotion   Active promotion label, or null if no promotion applies.
 */
public record ProductRecommendation(
        String productSku,
        String productName,
        int score,
        String reason,
        BigDecimal marginDelta,
        String promotion) {
}
