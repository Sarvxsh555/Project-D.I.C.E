import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function recommendationRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/recommendations', 'recommendation');
}
