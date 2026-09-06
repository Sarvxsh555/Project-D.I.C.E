import 'dotenv/config';
import express from 'express';
import { executeKw } from './odooRpc.js';
import { createPoller } from './poller.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 8092;
const DICE_WEBHOOK_URL = process.env.DICE_WEBHOOK_URL || 'http://localhost:8082/api/webhooks/odoo';
const WEBHOOK_KEY = process.env.OEEG_WEBHOOK_KEY || 'oeeg-demo-key';

const SCENARIOS = {
  'stock.replenished': {
    odooModel: 'stock.quant',
    description: 'Warehouse received stock. D.I.C.E. may surface Consolidate Remaining Backorder.',
    payload: (body) => ({
      productId: body.productId ?? 1,
      warehouseId: body.warehouseId ?? 1,
      quantity: body.quantity ?? 10,
    }),
  },
  'account.payment_posted': {
    odooModel: 'account.payment',
    description: 'Customer payment posted in accounting. D.I.C.E. records cash-received, does not book the ledger.',
    payload: (body) => ({
      invoiceRef: body.invoiceRef ?? 'INV/DEMO/0001',
      amount: body.amount ?? 0,
      currency: body.currency ?? 'INR',
    }),
  },
  'stock.picking_done': {
    odooModel: 'stock.picking',
    description: 'Delivery order validated. D.I.C.E. records fulfillment progress / promise slippage input.',
    payload: (body) => ({
      pickingName: body.pickingName ?? 'WH/OUT/0001',
      warehouseId: body.warehouseId ?? 1,
    }),
  },
  'sale.order_confirmed': {
    odooModel: 'sale.order',
    description: 'Odoo sales order confirmed. D.I.C.E. binds the external SO id; it does not re-price.',
    payload: (body) => ({
      odooSaleOrderName: body.odooSaleOrderName ?? 'S00001',
    }),
  },
};

async function postToDice(event, extras = {}) {
  const scenario = SCENARIOS[event];
  const envelope = {
    event,
    odooModel: scenario.odooModel,
    quotationId: extras.quotationId ?? null,
    orderId: extras.orderId ?? null,
    payload: scenario.payload(extras),
    source: 'oeeg',
  };

  const res = await fetch(DICE_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OEEG-Key': WEBHOOK_KEY,
    },
    body: JSON.stringify(envelope),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'D.I.C.E. webhook rejected the event');
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return { posted: envelope, dice: data };
}

const poller = createPoller({ scenarios: SCENARIOS, postToDice });

app.get('/api/oeeg/health', (_req, res) => {
  res.json({
    service: 'OEEG',
    meaning: 'Odoo Event Emulator Gateway',
    intelligence: false,
    decisionEngine: 'D.I.C.E.',
    liveOdooRpc: String(process.env.DICE_ODOO_ENABLED || '').toLowerCase() === 'true',
    webhook: DICE_WEBHOOK_URL,
    scenarios: Object.keys(SCENARIOS),
    poller: poller.status(),
  });
});

app.get('/api/oeeg/poller', (_req, res) => res.json(poller.status()));

/** Flip the background poller on or off without restarting the service. */
app.post('/api/oeeg/poller', (req, res) => {
  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'enabled (boolean) is required' });
  }
  res.json(poller.setEnabled(enabled));
});

/** Run a single poll pass immediately, whether or not the interval is armed. */
app.post('/api/oeeg/poller/run-once', async (_req, res, next) => {
  try {
    res.json({ ran: await poller.runOnce(), status: poller.status() });
  } catch (err) {
    next(err);
  }
});

app.get('/api/oeeg/scenarios', (_req, res) => {
  res.json(
    Object.entries(SCENARIOS).map(([id, s]) => ({
      id,
      odooModel: s.odooModel,
      description: s.description,
    }))
  );
});

app.post('/api/oeeg/scenarios/:event', async (req, res, next) => {
  try {
    const { event } = req.params;
    if (!SCENARIOS[event]) {
      return res.status(400).json({
        success: false,
        message: 'Unknown scenario',
        supported: Object.keys(SCENARIOS),
      });
    }
    const result = await postToDice(event, req.body || {});
    let liveOdoo = { skipped: true, reason: 'not requested' };
    if (req.body?.alsoCallLiveOdoo) {
      liveOdoo = await executeKw({
        model: SCENARIOS[event].odooModel,
        method: 'search_read',
        args: [[]],
        kwargs: { limit: 1 },
      });
    }
    res.status(201).json({ emulator: 'OEEG', ...result, liveOdoo });
  } catch (err) {
    next(err);
  }
});

app.post('/api/oeeg/odoo/execute-kw', async (req, res, next) => {
  try {
    const { model, method, args, kwargs } = req.body || {};
    if (!model || !method) {
      return res.status(400).json({ success: false, message: 'model and method are required' });
    }
    res.json(await executeKw({ model, method, args, kwargs }));
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message, detail: err.detail });
});

app.listen(PORT, () => {
  console.log(`OEEG (Odoo Event Emulator Gateway) on ${PORT} → ${DICE_WEBHOOK_URL}`);
  const started = poller.start();
  console.log(
    started.enabled
      ? `OEEG poller armed (${started.mode}, every ${started.intervalMs}ms, watching: ${started.watchedScenarios.join(', ')})`
      : 'OEEG poller idle (set OEEG_POLL_ENABLED=true to arm it)'
  );
});
