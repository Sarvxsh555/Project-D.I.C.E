/** Best-effort: if there's nothing active to invalidate (quote was never approved yet),
 *  that's not a failure - it's just a no-op from the negotiation's point of view. */
export async function invalidateApproval(quotationId, reason, bearerToken) {
  const res = await fetch(`${process.env.APPROVAL_SERVICE_BASE_URL}/approvals/by-quotation/${quotationId}/invalidate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || 'approval-engine: invalidation failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function createApprovalRequest(quotationId, bearerToken) {
  const res = await fetch(`${process.env.APPROVAL_SERVICE_BASE_URL}/approvals`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quotationId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || 'approval-engine: could not create new approval request');
    err.status = res.status;
    throw err;
  }
  return res.json();
}
