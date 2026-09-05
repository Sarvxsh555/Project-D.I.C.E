import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { GatewayError } from '../utils/errors.js';
import type { AuthUser, Role } from '../types/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

const PUBLIC_EXACT = new Set([
  '/health',
  '/metrics',
  '/documentation',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
]);

function isPublic(url: string, method: string): boolean {
  const path = url.split('?')[0];
  if (PUBLIC_EXACT.has(path)) return true;
  if (path.startsWith('/documentation')) return true;
  if (method === 'POST' && path === '/api/webhooks/odoo') return true;
  return false;
}

export function normalizeRole(role: string | undefined): Role {
  if (role === 'SALES_REP' || role === 'SALES') return role;
  if (
    role === 'ADMIN' ||
    role === 'SALES_MANAGER' ||
    role === 'FINANCE' ||
    role === 'CUSTOMER' ||
    role === 'WAREHOUSE'
  ) {
    return role;
  }
  return 'SALES_REP';
}

export async function authGuard(request: FastifyRequest, _reply: FastifyReply) {
  if (isPublic(request.url, request.method)) return;

  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new GatewayError(401, 'UNAUTHORIZED', 'Missing bearer token');
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
    request.user = {
      sub: String(payload.sub ?? ''),
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: normalizeRole(payload.role as string | undefined),
      tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
      customerId: typeof payload.customerId === 'number' ? payload.customerId : Number(payload.customerId) || undefined,
      jti: typeof payload.jti === 'string' ? payload.jti : undefined,
    };
  } catch {
    throw new GatewayError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}
