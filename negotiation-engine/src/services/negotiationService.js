import { pool } from '../db/pool.js';
import { fetchQuote, applyCounterDiscount, transitionQuote, snapshotOf } from './quotationClient.js';
import { invalidateApproval, createApprovalRequest } from './approvalClient.js';

class NegotiationError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export async function addComment(quotationId, lineId, message, requestedBy) {
  const row = await pool.query(
    `INSERT INTO negotiation_event (quotation_id, line_id, event_type, message, requested_by, status)
     VALUES ($1, $2, 'LINE_COMMENT', $3, $4, 'OPEN') RETURNING *`,
    [quotationId, lineId ?? null, message, requestedBy]
  );
  return row.rows[0];
}

export async function requestChange(quotationId, message, requestedBy) {
  const row = await pool.query(
    `INSERT INTO negotiation_event (quotation_id, event_type, message, requested_by, status)
     VALUES ($1, 'CHANGE_REQUEST', $2, $3, 'OPEN') RETURNING *`,
    [quotationId, message, requestedBy]
  );
  return row.rows[0];
}

export async function listEvents(quotationId) {
  const rows = await pool.query(
    `SELECT * FROM negotiation_event WHERE quotation_id = $1 ORDER BY created_at ASC`,
    [quotationId]
  );
  return rows.rows;
}

export async function listVersions(quotationId) {
  const rows = await pool.query(
    `SELECT * FROM quote_negotiation_version WHERE quotation_id = $1 ORDER BY created_at ASC`,
    [quotationId]
  );
  return rows.rows;
}

/**
 * The critical workflow: Approved Quote -> customer changes terms -> new quote version ->
 * previous approval invalidated -> governance re-run -> new approval chain.
 *
 * Each step is a call to the service that actually owns that responsibility - this engine
 * doesn't duplicate quote math, approval state, or governance rules, it only sequences them
 * and records what happened. If a step fails partway through, the event is marked FAILED
 * with the partial trail so far rather than silently reporting success.
 */
export async function submitCounterDiscount(quotationId, { lineId, proposedDiscountPercent, message }, requestedBy, bearerToken) {
  const eventRow = await pool.query(
    `INSERT INTO negotiation_event (quotation_id, line_id, event_type, message, payload, requested_by, status)
     VALUES ($1, $2, 'COUNTER_DISCOUNT', $3, $4, $5, 'OPEN') RETURNING *`,
    [quotationId, lineId, message, JSON.stringify({ proposedDiscountPercent }), requestedBy]
  );
  const event = eventRow.rows[0];

  const trail = {};
  try {
    // 1. Snapshot the quote as it stands before anything changes.
    const beforeQuote = await fetchQuote(quotationId, bearerToken);
    trail.before = await saveVersion(quotationId, event.id, 'before', beforeQuote);

    // 2. Apply the change. quotation-service is the sole owner of quote content and will
    //    flip an APPROVED quote to NEGOTIATION as part of this - that stage change is what
    //    makes the old approval's version hash stale.
    const negotiatedQuote = await applyCounterDiscount(
      quotationId, lineId, proposedDiscountPercent,
      message || 'Customer counter-discount', bearerToken
    );
    trail.negotiated = snapshotOf(negotiatedQuote);

    // 3. Explicitly invalidate whatever approval existed, rather than waiting for someone
    //    to eventually try to approve a now-stale request.
    trail.invalidatedApproval = await invalidateApproval(
      quotationId, `Renegotiated: ${message || 'counter-discount'}`, bearerToken
    );

    // 4. Snapshot the quote after the change.
    trail.after = await saveVersion(quotationId, event.id, 'after', negotiatedQuote);

    // 5. Put it back in front of a manager. quotation-service allows NEGOTIATION -> PENDING_APPROVAL.
    await transitionQuote(quotationId, 'PENDING_APPROVAL', bearerToken);

    // 6. New approval chain - approval-engine calls governance-engine fresh as part of this,
    //    so the re-evaluation happens here implicitly and correctly picks up the new numbers.
    trail.newApprovalRequest = await createApprovalRequest(quotationId, bearerToken);

    await pool.query(
      `UPDATE negotiation_event SET status = 'APPLIED', payload = $2 WHERE id = $1`,
      [event.id, JSON.stringify({ proposedDiscountPercent, trail })]
    );

    return { event: { ...event, status: 'APPLIED' }, ...trail };
  } catch (err) {
    await pool.query(
      `UPDATE negotiation_event SET status = 'FAILED', payload = $2 WHERE id = $1`,
      [event.id, JSON.stringify({ proposedDiscountPercent, trail, error: err.message })]
    );
    throw new NegotiationError(err.status || 500, `Negotiation workflow failed: ${err.message}`, trail);
  }
}

async function saveVersion(quotationId, eventId, label, quote) {
  const row = await pool.query(
    `INSERT INTO quote_negotiation_version
       (quotation_id, negotiation_event_id, version_label, stage, subtotal, discount_total, total, margin_percent, snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [quotationId, eventId, label, quote.stage, quote.subtotal, quote.discountTotal, quote.total, quote.marginPercent,
      JSON.stringify(snapshotOf(quote))]
  );
  return row.rows[0];
}

export { NegotiationError };
