import type { FastifyReply, FastifyRequest } from 'fastify';
import { GatewayError } from '../utils/errors.js';
import type { Role } from '../types/auth.js';

const ALIASES: Record<string, Role[]> = {
  SALES: ['SALES', 'SALES_REP'],
  SALES_REP: ['SALES', 'SALES_REP'],
};

function matches(required: Role[], actual: Role): boolean {
  if (actual === 'ADMIN') return true;
  return required.some((r) => {
    const group = ALIASES[r] ?? [r];
    return group.includes(actual);
  });
}

/** Coarse gateway RBAC. Services still enforce business rules. */
export function requireRoles(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) throw new GatewayError(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!matches(roles, request.user.role)) {
      throw new GatewayError(403, 'FORBIDDEN', `Requires one of: ${roles.join(', ')}`);
    }
  };
}

export async function oeegWebhookGuard(request: FastifyRequest, _reply: FastifyReply) {
  const key = request.headers['x-oeeg-key'];
  const expected = process.env.OEEG_WEBHOOK_KEY || 'oeeg-demo-key';
  if (key !== expected) {
    throw new GatewayError(401, 'UNAUTHORIZED', 'Invalid X-OEEG-Key');
  }
}
