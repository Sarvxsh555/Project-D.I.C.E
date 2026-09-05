import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function governanceRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/quotes', 'governance');
}
