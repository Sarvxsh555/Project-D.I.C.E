import {
  fetchQuote, listQuotesByRep, listAllOpenQuotes,
  fetchActiveApproval, countNegotiationEvents, checkShortage,
} from './clients.js';

function discountPercentOf(quote) {
  return quote.subtotal > 0 ? (quote.discountTotal / quote.subtotal) * 100 : 0;
}

async function repAverageDiscount(quote, bearerToken) {
  const repQuotes = await listQuotesByRep(quote.repUsername, bearerToken);
  const others = repQuotes.filter((q) => q.id !== quote.id && q.subtotal > 0);
  if (others.length === 0) return null;
  const avg = others.reduce((sum, q) => sum + discountPercentOf(q), 0) / others.length;
  return avg;
}

/**
 * Deal health, computed from real signals rather than a single field:
 * approval delay, discount deviation vs the rep's own average, inventory shortage,
 * negotiation count, and margin. Each signal that fires both docks the score and adds a
 * human-readable reason - a manager should be able to read the reasons and know exactly
 * what to look at, not just see a number.
 */
export async function computeHealth(quotationId, bearerToken) {
  const quote = await fetchQuote(quotationId, bearerToken);
  const reasons = [];
  let score = 100;

  // Approval delay
  const approval = await fetchActiveApproval(quotationId, bearerToken);
  if (approval && approval.status === 'PENDING') {
    const hoursPending = (Date.now() - new Date(approval.created_at).getTime()) / 3600000;
    if (hoursPending > 24) {
      score -= 30;
      reasons.push(`Approval pending ${hoursPending.toFixed(0)} hours`);
    } else if (hoursPending > 12) {
      score -= 15;
      reasons.push(`Approval pending ${hoursPending.toFixed(0)} hours`);
    }
  }

  // Customer inactivity (proxy: time since quote last updated, since there's no separate
  // customer-activity log yet)
  const hoursSinceUpdate = (Date.now() - new Date(quote.updatedAt).getTime()) / 3600000;
  if (hoursSinceUpdate > 72 && ['PENDING_APPROVAL', 'NEGOTIATION', 'APPROVED'].includes(quote.stage)) {
    score -= 10;
    reasons.push(`No activity for ${(hoursSinceUpdate / 24).toFixed(0)} days`);
  }

  // Discount deviation vs rep average
  const discountPercent = discountPercentOf(quote);
  const repAvg = await repAverageDiscount(quote, bearerToken);
  if (repAvg !== null && repAvg > 0 && discountPercent > repAvg * 1.5) {
    const multiple = discountPercent / repAvg;
    score -= 20;
    reasons.push(`Discount ${multiple.toFixed(1)}x rep average`);
  }

  // Inventory shortage
  const shortage = await checkShortage(quote.lines || [], bearerToken);
  if (shortage) {
    score -= 20;
    reasons.push('Inventory shortage');
  }

  // Negotiation count
  const negotiationCount = await countNegotiationEvents(quotationId, bearerToken);
  if (negotiationCount > 2) {
    score -= 10;
    reasons.push(`Renegotiated ${negotiationCount} times`);
  }

  // Margin
  if (quote.marginPercent < 15) {
    score -= 15;
    reasons.push(`Margin (${quote.marginPercent.toFixed(1)}%) below 15% floor`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const risk = score >= 80 ? 'HEALTHY' : score >= 50 ? 'AT_RISK' : 'CRITICAL';

  return {
    quotationId: quote.id,
    quoteNo: quote.quoteNo,
    customerName: quote.customerName,
    total: quote.total,
    score,
    risk,
    reasons,
  };
}

export async function computeDashboard(bearerToken) {
  const quotes = await listAllOpenQuotes(bearerToken);
  const results = await Promise.all(quotes.map((q) => computeHealth(q.id, bearerToken).catch(() => null)));
  const healthy = results.filter((r) => r && r.risk === 'HEALTHY');
  const atRisk = results.filter((r) => r && r.risk === 'AT_RISK');
  const critical = results.filter((r) => r && r.risk === 'CRITICAL');

  return {
    summary: { healthy: healthy.length, atRisk: atRisk.length, critical: critical.length },
    deals: [...critical, ...atRisk, ...healthy].sort((a, b) => a.score - b.score),
  };
}
