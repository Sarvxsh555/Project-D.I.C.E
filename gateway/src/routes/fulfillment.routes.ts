import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function fulfillmentRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/fulfillment', 'fulfillment');
}
