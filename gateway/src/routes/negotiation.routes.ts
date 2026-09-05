import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function negotiationRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/negotiations', 'negotiation');
}
