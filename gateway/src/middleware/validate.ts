import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { GatewayError } from '../utils/errors.js';
import type { ZodType } from 'zod';

export function validateBody(schema: ZodType) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      throw new GatewayError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body');
    }
    request.body = parsed.data;
  };
}
