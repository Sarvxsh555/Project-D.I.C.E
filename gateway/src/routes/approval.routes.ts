import type { FastifyInstance } from 'fastify';
import { mountProxy } from '../proxy/forward.js';

export async function approvalRoutes(app: FastifyInstance) {
  mountProxy(app, '/api/approvals', 'approval');
}
