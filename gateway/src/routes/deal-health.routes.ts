import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function dealHealthRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/deal-health', 'dealHealth');
}
