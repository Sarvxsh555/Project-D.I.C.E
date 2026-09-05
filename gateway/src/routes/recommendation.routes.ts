import type { FastifyInstance } from 'fastify';
import { createProxyHandler } from '../proxy/forward.js';

export async function recommendationRoutes(app: FastifyInstance) {
  const rank = createProxyHandler('recommendation');
  const catalog = createProxyHandler('quotation');
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
  app.route({ method: [...methods], url: '/api/recommendations/rank', handler: rank });
  app.route({ method: [...methods], url: '/api/recommendations', handler: catalog });
}
