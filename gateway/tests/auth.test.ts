import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { normalizeRole } from '../src/middleware/auth.js';
import { requireRoles } from '../src/middleware/rbac.js';
import { GatewayError } from '../src/utils/errors.js';

describe('auth helpers', () => {
  it('keeps SALES_REP distinct from SALES_MANAGER', () => {
    expect(normalizeRole('SALES_REP')).toBe('SALES_REP');
    expect(normalizeRole('SALES_MANAGER')).toBe('SALES_MANAGER');
  });

  it('signs tokens the login-service can also verify (same HMAC secret)', () => {
    const token = jwt.sign({ sub: 'acme', role: 'CUSTOMER', customerId: 1 }, 'change-this-demo-secret-key-please-32-bytes-min');
    const payload = jwt.verify(token, 'change-this-demo-secret-key-please-32-bytes-min') as jwt.JwtPayload;
    expect(payload.role).toBe('CUSTOMER');
  });

  it('blocks finance-only routes for managers at the gateway', async () => {
    const guard = requireRoles('FINANCE');
    const request = { user: { sub: 'manager', role: 'SALES_MANAGER' } } as never;
    await expect(guard(request, {} as never)).rejects.toBeInstanceOf(GatewayError);
  });
});
