import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function authRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/auth', 'login');
  mountProxy(app, '/api/portal', 'login');
  mountProxy(app, '/api/admin', 'login');
}
