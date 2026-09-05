import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function productsRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/products', 'quotation');
}
