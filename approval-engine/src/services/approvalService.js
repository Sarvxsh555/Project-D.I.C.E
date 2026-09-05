import { pool } from '../db/pool.js';
import { fetchQuote, transitionQuote, computeQuoteVersionHash } from './quotationClient.js';
import { evaluateQuote } from './governanceClient.js';

class ApprovalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const EXPIRY_HOURS = Number(process.env.APPROVAL_EXPIRY_HOURS || 72);

export async function createApprovalRequest(quotationId, requestedBy, bearerToken) {
  const quote = await fetchQuote(quotationId, bearerToken);
  if (quote.stage !== 'PENDING_APPROVAL') {
    throw new ApprovalError(409, `Quote must be submitted for approval first (currently ${quote.stage})`);
  }

  const existing = await pool.query(
    `SELECT id FROM approval_request WHERE quotation_id = $1 AND status = 'PENDING'`,
    [quotationId]
  );
  if (existing.rows.length > 0) {
    throw new ApprovalError(409, 'An approval request is already pending for this quote');
  }

  const evaluation = await evaluateQuote(quotationId, bearerToken);
  const versionHash = computeQuoteVersionHash(quote);
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 3600 * 1000);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const initialStatus = evaluation.approval_required ? 'PENDING' : 'APPROVED';
    const requestRow = await client.query(
      `INSERT INTO approval_request (quotation_id, quote_version_hash, risk_score, required_level, status, requested_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [quotationId, versionHash, evaluation.risk_score, evaluation.required_level, initialStatus, requestedBy, expiresAt]
    );
    const request = requestRow.rows[0];

    for (let i = 0; i < evaluation.approval_chain.length; i++) {
      await client.query(
        `INSERT INTO approval_step (approval_request_id, step_order, required_role, status)
         VALUES ($1, $2, $3, $4)`,
        [request.id, i, evaluation.approval_chain[i], 'PENDING']
      );
    }

    if (!evaluation.approval_required) {
      await client.query(
        `INSERT INTO approval_decision (approval_request_id, decided_by, decision, reason, quote_version_hash_at_decision)
         VALUES ($1, 'system:governance-engine', 'AUTO_APPROVE', 'Risk below approval threshold', $2)`,
        [request.id, versionHash]
      );
    }

    await client.query('COMMIT');

    if (!evaluation.approval_required) {
      await transitionQuote(quotationId, 'APPROVED', bearerToken);
    }

    return getApprovalRequest(request.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getApprovalRequest(id) {
  const requestRow = await pool.query(`SELECT * FROM approval_request WHERE id = $1`, [id]);
  if (requestRow.rows.length === 0) throw new ApprovalError(404, 'Approval request not found');

  const request = await applyExpiryIfDue(requestRow.rows[0]);
  const steps = await pool.query(
    `SELECT * FROM approval_step WHERE approval_request_id = $1 ORDER BY step_order ASC`,
    [id]
  );
  return { ...request, steps: steps.rows };
}

export async function listApprovalRequests({ quotationId, status }) {
  const conditions = [];
  const params = [];
  if (quotationId) {
    params.push(quotationId);
    conditions.push(`quotation_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await pool.query(
    `SELECT * FROM approval_request ${where} ORDER BY created_at DESC`,
    params
  );
  return rows.rows;
}

/**
 * Called by the Negotiation Engine right after it changes a quote's terms. There is no
 * "manager decision" here - a renegotiated quote simply no longer represents what was
 * approved, so whatever approval exists (pending or already granted) is proactively
 * invalidated rather than waiting for the next stale /approve attempt to catch it.
 */
export async function invalidateForQuotation(quotationId, invalidatedBy, reason) {
  const active = await pool.query(
    `SELECT * FROM approval_request WHERE quotation_id = $1 AND status IN ('PENDING', 'APPROVED')
     ORDER BY created_at DESC LIMIT 1`,
    [quotationId]
  );
  if (active.rows.length === 0) {
    throw new ApprovalError(404, 'No active approval to invalidate for this quotation');
  }

  const request = active.rows[0];
  await pool.query(`UPDATE approval_request SET status = 'RETURNED', updated_at = now() WHERE id = $1`, [request.id]);
  await pool.query(
    `INSERT INTO approval_decision (approval_request_id, decided_by, decision, reason, quote_version_hash_at_decision)
     VALUES ($1, $2, 'INVALIDATED', $3, $4)`,
    [request.id, invalidatedBy, reason || 'Quote renegotiated', request.quote_version_hash]
  );
  return getApprovalRequest(request.id);
}

export async function getDecisions(requestId) {
  const rows = await pool.query(
    `SELECT * FROM approval_decision WHERE approval_request_id = $1 ORDER BY created_at ASC`,
    [requestId]
  );
  return rows.rows;
}

/**
 * The one and only path by which a quote is allowed to reach APPROVED. Re-verifies identity
 * (caller), authority (requireApprover middleware), state (PENDING, not expired), and quote
 * version (has the quote changed since this request was created) before touching anything.
 */
export async function approveStep(requestId, user, reason, bearerToken) {
  const request = await getApprovalRequest(requestId);
  assertActionable(request);

  const step = request.steps.find((s) => s.status === 'PENDING');
  if (!step) throw new ApprovalError(409, 'No pending approval step');

  const liveQuote = await fetchQuote(request.quotation_id, bearerToken);
  const liveHash = computeQuoteVersionHash(liveQuote);
  if (liveHash !== request.quote_version_hash) {
    await pool.query(`UPDATE approval_request SET status = 'RETURNED', updated_at = now() WHERE id = $1`, [requestId]);
    await pool.query(
      `INSERT INTO approval_decision (approval_request_id, approval_step_id, decided_by, decision, reason, quote_version_hash_at_decision)
       VALUES ($1, $2, $3, 'INVALIDATED', 'Quote changed since this approval was requested', $4)`,
      [requestId, step.id, user.username, liveHash]
    );
    throw new ApprovalError(409, 'Quote has changed since this approval was requested. Please resubmit for approval.');
  }

  await pool.query(
    `UPDATE approval_step SET status = 'APPROVED', decided_by = $1, decided_at = now() WHERE id = $2`,
    [user.username, step.id]
  );
  await pool.query(
    `INSERT INTO approval_decision (approval_request_id, approval_step_id, decided_by, decision, reason, quote_version_hash_at_decision)
     VALUES ($1, $2, $3, 'APPROVE', $4, $5)`,
    [requestId, step.id, user.username, reason, liveHash]
  );

  const remaining = request.steps.filter((s) => s.id !== step.id && s.status === 'PENDING');
  if (remaining.length === 0) {
    await pool.query(`UPDATE approval_request SET status = 'APPROVED', updated_at = now() WHERE id = $1`, [requestId]);
    await transitionQuote(request.quotation_id, 'APPROVED', bearerToken);
  }

  return getApprovalRequest(requestId);
}

export async function rejectRequest(requestId, user, reason, bearerToken) {
  const request = await getApprovalRequest(requestId);
  assertActionable(request);

  const step = request.steps.find((s) => s.status === 'PENDING');
  await pool.query(`UPDATE approval_request SET status = 'REJECTED', updated_at = now() WHERE id = $1`, [requestId]);
  await pool.query(
    `INSERT INTO approval_decision (approval_request_id, approval_step_id, decided_by, decision, reason, quote_version_hash_at_decision)
     VALUES ($1, $2, $3, 'REJECT', $4, $5)`,
    [requestId, step?.id ?? null, user.username, reason, request.quote_version_hash]
  );
  await transitionQuote(request.quotation_id, 'DRAFT', bearerToken);
  return getApprovalRequest(requestId);
}

export async function returnRequest(requestId, user, reason, bearerToken) {
  const request = await getApprovalRequest(requestId);
  assertActionable(request);

  const step = request.steps.find((s) => s.status === 'PENDING');
  await pool.query(`UPDATE approval_request SET status = 'RETURNED', updated_at = now() WHERE id = $1`, [requestId]);
  await pool.query(
    `INSERT INTO approval_decision (approval_request_id, approval_step_id, decided_by, decision, reason, quote_version_hash_at_decision)
     VALUES ($1, $2, $3, 'RETURN', $4, $5)`,
    [requestId, step?.id ?? null, user.username, reason, request.quote_version_hash]
  );
  await transitionQuote(request.quotation_id, 'DRAFT', bearerToken);
  return getApprovalRequest(requestId);
}

function assertActionable(request) {
  if (request.status !== 'PENDING') {
    throw new ApprovalError(409, `Approval request is ${request.status.toLowerCase()}, not pending`);
  }
}

async function applyExpiryIfDue(request) {
  if (request.status === 'PENDING' && new Date(request.expires_at) < new Date()) {
    const updated = await pool.query(
      `UPDATE approval_request SET status = 'EXPIRED', updated_at = now() WHERE id = $1 RETURNING *`,
      [request.id]
    );
    return updated.rows[0];
  }
  return request;
}

export { ApprovalError };
