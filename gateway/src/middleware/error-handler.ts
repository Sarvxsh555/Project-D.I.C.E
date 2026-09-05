import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { GatewayError, mapUpstreamStatus } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const requestId = request.requestId ?? 'unknown';

  if (err instanceof GatewayError) {
    return sendError(reply, err.statusCode, err.code, err.message, err.service, requestId);
  }

  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  logger.error({ err, requestId, url: request.url }, 'gateway error');
  return sendError(
    reply,
    status,
    mapUpstreamStatus(status),
    err.message || 'Internal gateway error',
    'gateway',
    requestId
  );
}
