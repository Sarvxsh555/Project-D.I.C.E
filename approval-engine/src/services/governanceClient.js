export async function evaluateQuote(quotationId, bearerToken) {
  const res = await fetch(`${process.env.GOVERNANCE_SERVICE_BASE_URL}/quotes/${quotationId}/evaluate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || 'governance-engine: evaluation failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}
