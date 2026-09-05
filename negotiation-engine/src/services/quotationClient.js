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

export async function applyCounterDiscount(quotationId, lineId, proposedDiscountPercent, reason, bearerToken) {
  const res = await fetch(`${process.env.QUOTATION_SERVICE_BASE_URL}/quotations/${quotationId}/counter-discount`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineId, proposedDiscountPercent, reason }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || 'quotation-service: counter-discount rejected');
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

export function snapshotOf(quote) {
  return {
    stage: quote.stage,
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    taxTotal: quote.taxTotal,
    total: quote.total,
    marginPercent: quote.marginPercent,
    lines: quote.lines,
  };
}
