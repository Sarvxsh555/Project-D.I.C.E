import type { FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export function requestIdHook(request: FastifyRequest, _reply: unknown, done: () => void) {
  const incoming = request.headers['x-request-id'];
  request.requestId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : `req_${randomBytes(8).toString('hex')}`;
  done();
}
