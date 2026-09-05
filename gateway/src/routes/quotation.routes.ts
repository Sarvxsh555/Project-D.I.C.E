import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function quotationRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/quotations', 'quotation');
}
