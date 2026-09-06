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

/** Largest concession (in discount percentage points) that may skip the human queue. */
const AUTO_ACCEPT_POINTS = Number(process.env.NEGOTIATION_AUTO_ACCEPT_POINTS ?? 2);

/**
 * Reads a D.I.C.E. policy number from the shared governance_threshold table so this engine
 * uses the same margin floor the scoring engine does, rather than keeping its own copy.
 */
async function thresholdValue(key, fallback) {
  try {
    const row = await pool.query(
      `SELECT threshold_value FROM governance_threshold WHERE threshold_key = $1`,
      [key]
    );
    return row.rows.length > 0 ? Number(row.rows[0].threshold_value) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Margin is redacted out of customer-facing quote payloads, and a counter-discount is
 * submitted with the customer's own token - so the margin guard has to read the stored
 * value rather than trust what came back over the wire.
 */
async function storedMarginPercent(quotationId) {
  const row = await pool.query(`SELECT margin_percent FROM quotation WHERE id = $1`, [quotationId]);
  if (row.rows.length === 0) return null;
  return Number(row.rows[0].margin_percent);
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

export async function listVersions(quotationId, redactInternal = false) {
  const rows = await pool.query(
    `SELECT * FROM quote_negotiation_version WHERE quotation_id = $1 ORDER BY created_at ASC`,
    [quotationId]
  );
  if (!redactInternal) return rows.rows;
  return rows.rows.map((row) => {
    const { margin_percent, snapshot, ...rest } = row;
    const cleanSnapshot = { ...snapshot };
    delete cleanSnapshot.grossMargin;
    delete cleanSnapshot.marginPercent;
    delete cleanSnapshot.riskScore;
    if (Array.isArray(cleanSnapshot.lines)) {
      cleanSnapshot.lines = cleanSnapshot.lines.map(({ margin, ...line }) => line);
    }
    return { ...rest, snapshot: cleanSnapshot };
  });
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

    // 3. Snapshot the quote after the change.
    trail.after = await saveVersion(quotationId, event.id, 'after', negotiatedQuote);

    // 4. Decide whether this concession is small enough to stand on its own. Tearing down a
    //    signed-off approval and re-queuing it for a human is the right default, but it is
    //    pure churn when the customer nudged an already-approved quote by a fraction of a
    //    point and the margin still clears the floor. Both guards must hold, and the quote
    //    must already have been approved - a quote that never cleared review cannot skip it.
    const marginFloor = await thresholdValue('margin_floor', 20);
    const negotiatedMarginPercent = await storedMarginPercent(quotationId);
    const beforeLine = (beforeQuote.lines || []).find((l) => String(l.id) === String(lineId));
    const previousDiscountPercent = beforeLine ? Number(beforeLine.discountPercent) : null;
    const concessionPoints =
      previousDiscountPercent === null ? null : Number(proposedDiscountPercent) - previousDiscountPercent;

    const autoAcceptable =
      beforeQuote.stage === 'APPROVED' &&
      concessionPoints !== null &&
      concessionPoints <= AUTO_ACCEPT_POINTS &&
      negotiatedMarginPercent !== null &&
      negotiatedMarginPercent >= marginFloor;

    if (autoAcceptable) {
      // Straight back to APPROVED - the existing approval stays valid because the terms
      // moved within the band it was granted under.
      await transitionQuote(quotationId, 'APPROVED', bearerToken);
      trail.autoAccepted = {
        concessionPoints: Number(concessionPoints.toFixed(2)),
        allowedPoints: AUTO_ACCEPT_POINTS,
        marginPercent: negotiatedMarginPercent,
        marginFloor,
        reason: `Concession of ${concessionPoints.toFixed(2)} pts is within the ${AUTO_ACCEPT_POINTS} pt band and margin ${negotiatedMarginPercent.toFixed(1)}% still clears the ${marginFloor}% floor`,
      };

      await pool.query(
        `UPDATE negotiation_event SET status = 'AUTO_ACCEPTED', payload = $2 WHERE id = $1`,
        [event.id, JSON.stringify({ proposedDiscountPercent, trail })]
      );
      return { event: { ...event, status: 'AUTO_ACCEPTED' }, ...trail };
    }

    // 5. Otherwise: explicitly invalidate whatever approval existed, rather than waiting for
    //    someone to eventually try to approve a now-stale request.
    trail.invalidatedApproval = await invalidateApproval(
      quotationId, `Renegotiated: ${message || 'counter-discount'}`, bearerToken
    );

    // 6. Put it back in front of a manager. quotation-service allows NEGOTIATION -> PENDING_APPROVAL,
    //    and re-runs D.I.C.E. on the way in - a quote that now scores clean is approved on the
    //    spot and comes back already APPROVED rather than sitting in PENDING_APPROVAL.
    const resubmitted = await transitionQuote(quotationId, 'PENDING_APPROVAL', bearerToken);

    if (resubmitted?.stage === 'APPROVED') {
      // Nothing left for a human to sign off - asking approval-engine to open a request here
      // would just 409 on a quote that is no longer pending.
      trail.autoApprovedOnResubmit = {
        stage: resubmitted.stage,
        reason: 'D.I.C.E. cleared the renegotiated quote during re-submission; no approval step needed',
      };
    } else {
      // 7. New approval chain - approval-engine calls governance-engine fresh as part of this,
      //    so the re-evaluation happens here implicitly and correctly picks up the new numbers.
      trail.newApprovalRequest = await createApprovalRequest(quotationId, bearerToken);
    }

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
