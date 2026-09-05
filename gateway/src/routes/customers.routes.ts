import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function customersRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/customers', 'quotation');
}
