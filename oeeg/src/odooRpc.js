/**
 * Optional live Odoo JSON-RPC. Disabled unless DICE_ODOO_ENABLED=true.
 * OEEG never makes D.I.C.E. decisions — it only talks to Odoo when explicitly armed.
 */
export async function executeKw({ model, method, args = [], kwargs = {} }) {
  const enabled = String(process.env.DICE_ODOO_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) {
    return { skipped: true, reason: 'DICE_ODOO_ENABLED is not true — live JSON-RPC disabled' };
  }

  const url = process.env.ODOO_URL;
  const db = process.env.ODOO_DB;
  const username = process.env.ODOO_USERNAME;
  const password = process.env.ODOO_API_KEY || process.env.ODOO_PASSWORD;
  if (!url || !db || !username || !password) {
    throw new Error('Live Odoo is enabled but ODOO_URL / ODOO_DB / ODOO_USERNAME / ODOO_API_KEY are missing');
  }

  const commonRes = await fetch(`${url.replace(/\/$/, '')}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service: 'common', method: 'authenticate', args: [db, username, password, {}] },
      id: Date.now(),
    }),
  });
  const commonJson = await commonRes.json();
  const uid = commonJson.result;
  if (!uid) {
    throw new Error('Odoo authenticate failed');
  }

  const objectRes = await fetch(`${url.replace(/\/$/, '')}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [db, uid, password, model, method, args, kwargs],
      },
      id: Date.now() + 1,
    }),
  });
  const objectJson = await objectRes.json();
  if (objectJson.error) {
    throw new Error(objectJson.error.message || 'Odoo execute_kw failed');
  }
  return { skipped: false, result: objectJson.result };
}
