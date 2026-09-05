import { pool } from '../db/pool.js';

class BillingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const CYCLE_DAYS = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365 };

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function daysBetween(a, b) {
  return Math.max(0, (new Date(b) - new Date(a)) / 86400000);
}
function round(v) {
  return Math.round(v * 100) / 100;
}
function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/** Initial invoice: one-time lines are billed immediately in full; recurring lines are
 *  billed for their first period now, and a Subscription + the next BillingSchedule entry
 *  are created so run-recurring can pick up subsequent periods later. */
export async function initializeBilling(orderId, lines) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const oneTimeLines = lines.filter((l) => l.type === 'ONE_TIME');
    const recurringLines = lines.filter((l) => l.type === 'RECURRING');

    let oneTimeInvoice = null;
    if (oneTimeLines.length > 0) {
      const amount = round(oneTimeLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
      oneTimeInvoice = await createInvoice(client, orderId, 'ONE_TIME', amount, null, null);
      for (const l of oneTimeLines) {
        await addInvoiceLine(client, oneTimeInvoice.id, l.productName, l.quantity, l.unitPrice);
      }
    }

    const subscriptions = [];
    const recurringInvoices = [];
    const today = isoDate(new Date());
    for (const l of recurringLines) {
      const cycleDays = CYCLE_DAYS[l.billingCycle] || CYCLE_DAYS.MONTHLY;
      const periodEnd = isoDate(addDays(today, cycleDays));

      const subRow = await client.query(
        `INSERT INTO subscription (order_id, product_id, product_name, quantity, unit_price, billing_cycle, next_billing_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [orderId, l.productId, l.productName, l.quantity, l.unitPrice, l.billingCycle || 'MONTHLY', periodEnd]
      );
      const subscription = subRow.rows[0];
      subscriptions.push(subscription);

      const amount = round(l.quantity * l.unitPrice);
      const invoice = await createInvoice(client, orderId, 'RECURRING', amount, today, periodEnd);
      await addInvoiceLine(client, invoice.id, `${l.productName} (${today} to ${periodEnd})`, l.quantity, l.unitPrice);
      await client.query(
        `INSERT INTO billing_schedule (subscription_id, period_start, period_end, amount, status, invoice_id)
         VALUES ($1,$2,$3,$4,'BILLED',$5)`,
        [subscription.id, today, periodEnd, amount, invoice.id]
      );
      recurringInvoices.push(invoice);
    }

    await client.query('COMMIT');
    return { oneTimeInvoice, recurringInvoices, subscriptions };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function changeQuantity(subscriptionId, newQuantity) {
  const subscription = await getSubscriptionOrThrow(subscriptionId);
  if (subscription.status !== 'ACTIVE') throw new BillingError(409, 'Subscription is not active');

  const lastSchedule = await pool.query(
    `SELECT * FROM billing_schedule WHERE subscription_id = $1 ORDER BY period_end DESC LIMIT 1`,
    [subscriptionId]
  );
  const periodStart = lastSchedule.rows[0]?.period_start || subscription.start_date;
  const periodEnd = subscription.next_billing_date;

  const totalDays = daysBetween(periodStart, periodEnd) || 1;
  const daysRemaining = daysBetween(isoDate(new Date()), periodEnd);
  const delta = newQuantity - subscription.quantity;
  const proratedAmount = round(delta * subscription.unit_price * (daysRemaining / totalDays));

  let invoice = null;
  let creditNote = null;
  if (proratedAmount > 0) {
    invoice = await createInvoice(pool, subscription.order_id, 'RECURRING', proratedAmount, isoDate(new Date()), periodEnd);
    await addInvoiceLine(pool, invoice.id, `${subscription.product_name} - quantity increase (prorated)`, delta, subscription.unit_price);
  } else if (proratedAmount < 0) {
    creditNote = await createCreditNote(subscription.order_id, subscriptionId, Math.abs(proratedAmount),
      'Quantity decreased mid-cycle (prorated credit)');
  }

  const updated = await pool.query(`UPDATE subscription SET quantity = $1 WHERE id = $2 RETURNING *`, [newQuantity, subscriptionId]);
  return { subscription: updated.rows[0], proratedAmount, invoice, creditNote };
}

export async function cancelSubscription(subscriptionId, reason) {
  const subscription = await getSubscriptionOrThrow(subscriptionId);
  if (subscription.status !== 'ACTIVE') throw new BillingError(409, 'Subscription is not active');

  const lastSchedule = await pool.query(
    `SELECT * FROM billing_schedule WHERE subscription_id = $1 ORDER BY period_end DESC LIMIT 1`,
    [subscriptionId]
  );
  const periodStart = lastSchedule.rows[0]?.period_start || subscription.start_date;
  const periodEnd = subscription.next_billing_date;
  const totalDays = daysBetween(periodStart, periodEnd) || 1;
  const daysRemaining = daysBetween(isoDate(new Date()), periodEnd);

  const refundAmount = round(subscription.quantity * subscription.unit_price * (daysRemaining / totalDays));
  let refund = null;
  if (refundAmount > 0) {
    const row = await pool.query(
      `INSERT INTO refund (order_id, subscription_id, amount, reason) VALUES ($1,$2,$3,$4) RETURNING *`,
      [subscription.order_id, subscriptionId, refundAmount, reason || 'Subscription cancelled mid-cycle']
    );
    refund = row.rows[0];
  }

  const updated = await pool.query(`UPDATE subscription SET status = 'CANCELLED' WHERE id = $1 RETURNING *`, [subscriptionId]);
  return { subscription: updated.rows[0], refund };
}

export async function runRecurring(orderId) {
  const today = isoDate(new Date());
  const due = await pool.query(
    `SELECT * FROM subscription WHERE order_id = $1 AND status = 'ACTIVE' AND next_billing_date <= $2`,
    [orderId, today]
  );

  const invoices = [];
  for (const subscription of due.rows) {
    const cycleDays = CYCLE_DAYS[subscription.billing_cycle] || CYCLE_DAYS.MONTHLY;
    const periodStart = subscription.next_billing_date;
    const periodEnd = isoDate(addDays(periodStart, cycleDays));
    const amount = round(subscription.quantity * subscription.unit_price);

    const invoice = await createInvoice(pool, orderId, 'RECURRING', amount, periodStart, periodEnd);
    await addInvoiceLine(pool, invoice.id, `${subscription.product_name} (${periodStart} to ${periodEnd})`, subscription.quantity, subscription.unit_price);
    await pool.query(
      `INSERT INTO billing_schedule (subscription_id, period_start, period_end, amount, status, invoice_id)
       VALUES ($1,$2,$3,$4,'BILLED',$5)`,
      [subscription.id, periodStart, periodEnd, amount, invoice.id]
    );
    await pool.query(`UPDATE subscription SET next_billing_date = $1 WHERE id = $2`, [periodEnd, subscription.id]);
    invoices.push(invoice);
  }
  return invoices;
}

export async function addCreditNote(orderId, subscriptionId, amount, reason) {
  return createCreditNote(orderId, subscriptionId, amount, reason);
}

export async function getOrderBilling(orderId) {
  const invoices = await pool.query(`SELECT * FROM invoice WHERE order_id = $1 ORDER BY issued_at ASC`, [orderId]);
  const invoiceIds = invoices.rows.map((i) => i.id);
  const lines = invoiceIds.length
    ? await pool.query(`SELECT * FROM invoice_line WHERE invoice_id = ANY($1::int[])`, [invoiceIds])
    : { rows: [] };

  const subscriptions = await pool.query(`SELECT * FROM subscription WHERE order_id = $1 ORDER BY id ASC`, [orderId]);
  const subIds = subscriptions.rows.map((s) => s.id);
  const schedules = subIds.length
    ? await pool.query(`SELECT * FROM billing_schedule WHERE subscription_id = ANY($1::int[]) ORDER BY period_start ASC`, [subIds])
    : { rows: [] };

  const creditNotes = await pool.query(`SELECT * FROM credit_note WHERE order_id = $1 ORDER BY created_at ASC`, [orderId]);
  const refunds = await pool.query(`SELECT * FROM refund WHERE order_id = $1 ORDER BY created_at ASC`, [orderId]);

  const nextBillingDate = subscriptions.rows
    .filter((s) => s.status === 'ACTIVE')
    .map((s) => s.next_billing_date)
    .sort()[0] || null;

  return {
    orderId: Number(orderId),
    invoices: invoices.rows.map((inv) => ({ ...inv, lines: lines.rows.filter((l) => l.invoice_id === inv.id) })),
    subscriptions: subscriptions.rows,
    schedules: schedules.rows,
    creditNotes: creditNotes.rows,
    refunds: refunds.rows,
    nextBillingDate,
  };
}

async function createInvoice(db, orderId, type, amount, periodStart, periodEnd) {
  const row = await db.query(
    `INSERT INTO invoice (order_id, type, amount, period_start, period_end) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [orderId, type, amount, periodStart, periodEnd]
  );
  return row.rows[0];
}

async function addInvoiceLine(db, invoiceId, description, quantity, unitPrice) {
  await db.query(
    `INSERT INTO invoice_line (invoice_id, description, quantity, unit_price, amount) VALUES ($1,$2,$3,$4,$5)`,
    [invoiceId, description, quantity, unitPrice, round(quantity * unitPrice)]
  );
}

async function createCreditNote(orderId, subscriptionId, amount, reason) {
  const row = await pool.query(
    `INSERT INTO credit_note (order_id, subscription_id, amount, reason) VALUES ($1,$2,$3,$4) RETURNING *`,
    [orderId, subscriptionId, round(amount), reason]
  );
  return row.rows[0];
}

async function getSubscriptionOrThrow(id) {
  const row = await pool.query(`SELECT * FROM subscription WHERE id = $1`, [id]);
  if (row.rows.length === 0) throw new BillingError(404, 'Subscription not found');
  return row.rows[0];
}

export { BillingError };
