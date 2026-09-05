package com.dice.domain;

import java.util.List;
import java.util.UUID;

/**
 * Result container for co-purchase recommendations generated for a deal.
 *
 * @param dealId          The ID of the deal evaluated.
 * @param quotationId     The quotation/deal reference identifier (e.g. deal number).
 * @param recommendations Deterministically ordered list of product recommendations.
 */
public record RecommendationResult(
        UUID dealId,
        String quotationId,
        List<ProductRecommendation> recommendations) {

    public RecommendationResult(List<ProductRecommendation> recommendations, String quotationId) {
        this(null, quotationId, recommendations);
    }
}
