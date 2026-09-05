import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';
import { requireRoles } from '../middleware/rbac.js';

export async function billingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/billing')) return;
    if (request.method === 'GET' || request.method === 'OPTIONS') return;
    await requireRoles('FINANCE')(request, reply);
  });
  mountProxy(app, '/api/billing', 'billing');
}
