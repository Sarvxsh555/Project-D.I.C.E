import crypto from 'crypto';

export async function fetchQuote(quotationId, bearerToken) {
  const res = await fetch(`${process.env.QUOTATION_SERVICE_BASE_URL}/quotations/${quotationId}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || 'quotation-service: quote not accessible');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function transitionQuote(quotationId, toStage, bearerToken) {
  const res = await fetch(`${process.env.QUOTATION_SERVICE_BASE_URL}/quotations/${quotationId}/transition`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ toStage }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || 'quotation-service: transition failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Fingerprints the parts of a quote that matter for approval validity: if any of this
 * changes after an approval request is created, the approval is stale and must be re-run -
 * this is the "whether quote changed" check the approval engine is required to perform.
 */
export function computeQuoteVersionHash(quote) {
  const material = JSON.stringify({
    stage: quote.stage,
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    taxTotal: quote.taxTotal,
    total: quote.total,
    marginPercent: quote.marginPercent,
    lines: (quote.lines || [])
      .map((l) => `${l.productId}:${l.quantity}:${l.unitPrice}:${l.discountPercent}`)
      .sort(),
  });
  return crypto.createHash('sha256').update(material).digest('hex');
}
