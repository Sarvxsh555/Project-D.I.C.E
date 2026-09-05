import type { FastifyInstance } from 'fastify';
import { createProxyHandler, mountProxy } from '../proxy/forward.js';
import { oeegWebhookGuard } from '../middleware/rbac.js';

/** D.I.C.E. is quotation-service. OEEG only posts webhooks; it never owns /api/dice. */
export async function diceRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/dice', 'quotation');
  app.post(
    '/api/webhooks/odoo',
    { preHandler: oeegWebhookGuard },
    createProxyHandler('quotation')
  );
}
