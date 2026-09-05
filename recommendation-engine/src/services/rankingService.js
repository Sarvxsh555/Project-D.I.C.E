async function fetchCandidates(productIds, bearerToken) {
  const res = await fetch(
    `${process.env.QUOTATION_SERVICE_BASE_URL}/recommendations?productIds=${productIds.join(',')}`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || 'quotation-service: could not fetch candidates');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * score = co_purchase_score + promotion_boost + margin_score, then filter out anything
 * below the configured minimum margin. Deliberately simple - three additive terms and one
 * threshold, nothing clever.
 */
export async function rankRecommendations(productIds, minMarginPercent, bearerToken) {
  const candidates = await fetchCandidates(productIds, bearerToken);

  return candidates
    .map((c) => {
      const promotionBoost = c.promotion && c.promotion.toLowerCase() !== 'none' ? 0.2 : 0;
      const marginScore = c.marginImpactPercent / 10;
      const score = c.coPurchaseScore + promotionBoost + marginScore;
      return {
        productId: c.productId,
        productName: c.productName,
        reason: c.reason,
        promotion: c.promotion,
        marginImpactPercent: c.marginImpactPercent,
        coPurchaseScore: c.coPurchaseScore,
        promotionBoost,
        marginScore: Number(marginScore.toFixed(3)),
        score: Number(score.toFixed(3)),
      };
    })
    .filter((c) => c.marginImpactPercent >= minMarginPercent)
    .sort((a, b) => b.score - a.score);
}
