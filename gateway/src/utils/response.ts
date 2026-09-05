import type { FastifyReply } from 'fastify';
import { env } from '../config/env.js';

export function sendData(reply: FastifyReply, status: number, payload: unknown) {
  if (!env.GATEWAY_ENVELOPE) {
    return reply.status(status).send(payload);
  }
  return reply.status(status).send({ success: true, data: payload });
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  service: string,
  requestId: string
) {
  return reply.status(status).send({
    success: false,
    message,
    error: { code, message, service, requestId },
  });
}
