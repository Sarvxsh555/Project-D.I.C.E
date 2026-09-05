import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

/** D.I.C.E. lives on quotation-service. Never route this through OEEG. */
export async function diceRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/dice', 'quotation');
  app.post('/api/webhooks/odoo', { preHandler: (await import('../middleware/rbac.js')).oeegWebhookGuard }, 
    (await import('../proxy/forward.js')).createProxyHandler('quotation'));
}
