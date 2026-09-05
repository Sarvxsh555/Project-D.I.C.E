async function get(url, bearerToken) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${bearerToken}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `request to ${url} failed`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchQuote(quotationId, bearerToken) {
  return get(`${process.env.QUOTATION_SERVICE_BASE_URL}/quotations/${quotationId}`, bearerToken);
}

export async function listQuotesByRep(repUsername, bearerToken) {
  const data = await get(
    `${process.env.QUOTATION_SERVICE_BASE_URL}/quotations?rep=${encodeURIComponent(repUsername)}&size=200`,
    bearerToken
  );
  return data.content || [];
}

export async function listAllOpenQuotes(bearerToken) {
  const stages = ['DRAFT', 'PENDING_APPROVAL', 'NEGOTIATION', 'APPROVED'];
  const results = await Promise.all(
    stages.map((status) =>
      get(`${process.env.QUOTATION_SERVICE_BASE_URL}/quotations?status=${status}&size=200`, bearerToken)
    )
  );
  return results.flatMap((r) => r.content || []);
}

export async function fetchActiveApproval(quotationId, bearerToken) {
  const rows = await get(
    `${process.env.APPROVAL_SERVICE_BASE_URL}/approvals?quotationId=${quotationId}`,
    bearerToken
  );
  return rows.find((r) => r.status === 'PENDING') || rows[0] || null;
}

export async function countNegotiationEvents(quotationId, bearerToken) {
  try {
    const events = await get(`${process.env.NEGOTIATION_SERVICE_BASE_URL}/negotiations/${quotationId}/events`, bearerToken);
    return events.length;
  } catch {
    return 0;
  }
}

export async function checkShortage(lines, bearerToken) {
  for (const line of lines) {
    try {
      const stock = await get(`${process.env.INVENTORY_SERVICE_BASE_URL}/inventory/stock/${line.productId}`, bearerToken);
      if (stock.totalAvailable < line.quantity) return true;
    } catch {
      // no inventory configured for this product - not a shortage signal we can assert
    }
  }
  return false;
}
