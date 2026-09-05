import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function dataRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/tasks', 'data');
  mountProxy(app, '/api/notifications', 'data');
}
