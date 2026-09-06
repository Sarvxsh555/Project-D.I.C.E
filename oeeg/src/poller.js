import { executeKw } from './odooRpc.js';

/**
 * Turns OEEG from a button you press into something that runs on its own.
 *
 * Two modes, both opt-in via OEEG_POLL_ENABLED:
 *  - live  (DICE_ODOO_ENABLED=true): each tick asks Odoo which records of the watched models
 *    changed since the last watermark and emits one D.I.C.E. event per changed record.
 *  - emulated (default): no Odoo to ask, so each tick replays the configured scenarios. This
 *    exercises the ingest path end-to-end without anyone clicking through the dashboard.
 *
 * Disabled by default - nothing polls unless it is explicitly switched on.
 */

const DEFAULT_INTERVAL_MS = 60_000;
const MIN_INTERVAL_MS = 5_000;

function isTrue(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

export function createPoller({ scenarios, postToDice }) {
  const state = {
    enabled: isTrue(process.env.OEEG_POLL_ENABLED),
    intervalMs: Math.max(Number(process.env.OEEG_POLL_INTERVAL_MS) || DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS),
    watchedScenarios: (process.env.OEEG_POLL_SCENARIOS || 'stock.replenished')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && scenarios[s]),
    quotationId: process.env.OEEG_POLL_QUOTATION_ID ? Number(process.env.OEEG_POLL_QUOTATION_ID) : null,
    orderId: process.env.OEEG_POLL_ORDER_ID ? Number(process.env.OEEG_POLL_ORDER_ID) : null,
    watermark: new Date().toISOString().slice(0, 19).replace('T', ' '),
    running: false,
    ticks: 0,
    emitted: 0,
    lastTickAt: null,
    lastError: null,
    lastResults: [],
  };

  let timer = null;

  function mode() {
    return isTrue(process.env.DICE_ODOO_ENABLED) ? 'live' : 'emulated';
  }

  /** One pass over every watched scenario. Never throws - errors are recorded, not fatal. */
  async function tick() {
    if (state.running) return state.lastResults; // don't overlap a slow tick
    state.running = true;
    const results = [];

    try {
      for (const event of state.watchedScenarios) {
        try {
          if (mode() === 'live') {
            const changed = await findChangedRecords(event);
            for (const record of changed) {
              const posted = await postToDice(event, {
                quotationId: state.quotationId,
                orderId: state.orderId,
                ...recordToPayload(event, record),
              });
              state.emitted += 1;
              results.push({ event, source: 'odoo', recordId: record.id, dice: posted.dice });
            }
            if (changed.length === 0) results.push({ event, source: 'odoo', skipped: 'no changes since watermark' });
          } else {
            const posted = await postToDice(event, {
              quotationId: state.quotationId,
              orderId: state.orderId,
            });
            state.emitted += 1;
            results.push({ event, source: 'emulated', dice: posted.dice });
          }
        } catch (err) {
          results.push({ event, error: err.message });
          state.lastError = { at: new Date().toISOString(), event, message: err.message };
        }
      }

      if (mode() === 'live') {
        state.watermark = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
    } finally {
      state.ticks += 1;
      state.lastTickAt = new Date().toISOString();
      state.lastResults = results;
      state.running = false;
    }
    return results;
  }

  async function findChangedRecords(event) {
    const model = scenarios[event].odooModel;
    const response = await executeKw({
      model,
      method: 'search_read',
      args: [[['write_date', '>', state.watermark]]],
      kwargs: { limit: 25 },
    });
    if (!Array.isArray(response)) return []; // skipped/disabled shape
    return response;
  }

  /** Map an Odoo record onto the fields the scenario's payload builder expects. */
  function recordToPayload(event, record) {
    switch (event) {
      case 'stock.replenished':
        return { productId: record.product_id?.[0], warehouseId: record.warehouse_id?.[0], quantity: record.quantity };
      case 'account.payment_posted':
        return { invoiceRef: record.name, amount: record.amount, currency: record.currency_id?.[1] };
      case 'stock.picking_done':
        return { pickingName: record.name, warehouseId: record.picking_type_id?.[0] };
      case 'sale.order_confirmed':
        return { odooSaleOrderName: record.name };
      default:
        return {};
    }
  }

  function start() {
    if (timer || !state.enabled) return status();
    timer = setInterval(() => {
      tick().catch((err) => {
        state.lastError = { at: new Date().toISOString(), message: err.message };
      });
    }, state.intervalMs);
    if (typeof timer.unref === 'function') timer.unref(); // never hold the process open
    return status();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    return status();
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    if (state.enabled) start();
    else stop();
    return status();
  }

  function status() {
    return {
      enabled: state.enabled,
      active: Boolean(timer),
      mode: mode(),
      intervalMs: state.intervalMs,
      watchedScenarios: state.watchedScenarios,
      quotationId: state.quotationId,
      orderId: state.orderId,
      watermark: state.watermark,
      ticks: state.ticks,
      eventsEmitted: state.emitted,
      lastTickAt: state.lastTickAt,
      lastError: state.lastError,
      lastResults: state.lastResults,
    };
  }

  return { start, stop, setEnabled, runOnce: tick, status };
}
