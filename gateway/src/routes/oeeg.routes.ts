import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';
import { requireRoles } from '../middleware/rbac.js';
import { env } from '../config/env.js';

export async function oeegRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];
    if (!path.startsWith('/api/oeeg')) return;
    if (path === '/api/oeeg/health') return;
    if (env.GATEWAY_DEMO_OEEG) return;
    await requireRoles('ADMIN')(request, reply);
  });
  mountProxy(app, '/api/oeeg', 'oeeg');
}
