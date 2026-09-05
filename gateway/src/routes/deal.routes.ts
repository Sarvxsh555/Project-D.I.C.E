import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function dealRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/deals', 'deal');
  mountProxy(app, '/api/orders', 'deal');
}
