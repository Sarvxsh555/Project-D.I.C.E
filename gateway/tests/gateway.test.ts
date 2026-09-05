import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { buildApp } from '../src/app.js';

const secret = 'change-this-demo-secret-key-please-32-bytes-min';

describe('gateway', () => {
  it('health is public', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().engine).toBe('D.I.C.E.');
    await app.close();
  });

  it('rejects quotations without JWT', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/quotations' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
    expect(res.json().error.requestId).toBeTruthy();
    await app.close();
  });

  it('rejects odoo webhook without X-OEEG-Key', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/odoo',
      payload: { event: 'stock.replenished' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('accepts manager JWT at the gate (coarse RBAC)', async () => {
    const app = await buildApp();
    const token = jwt.sign({ sub: 'manager', role: 'SALES_MANAGER' }, secret, { expiresIn: '15m' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/quotations',
      headers: { authorization: `Bearer ${token}` },
    });
    // 502 if quotation-service is down; 200/empty if up — never 401
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).not.toBe(403);
    await app.close();
  });
});
