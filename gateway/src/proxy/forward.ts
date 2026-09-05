import type { FastifyInstance, FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify';
import { Buffer } from 'node:buffer';
import { upstreamRequest } from '../clients/http.client.js';
import { serviceUrl } from '../clients/service.client.js';
import type { ServiceName } from '../types/services.js';
import { GatewayError, mapUpstreamStatus } from '../utils/errors.js';
import { sendData, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const idempotency = new Map<string, { status: number; body: unknown; expires: number }>();
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function hopHeaders(request: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'x-request-id': request.requestId,
    accept: 'application/json',
  };
  const pass = ['authorization', 'cookie', 'x-xsrf-token', 'content-type', 'x-oeeg-key', 'idempotency-key'] as const;
  for (const name of pass) {
    const v = request.headers[name];
    if (typeof v === 'string') headers[name] = v;
  }
  if (request.user) {
    headers['x-user-sub'] = request.user.sub;
    headers['x-user-role'] = request.user.role;
    if (request.user.tenantId) headers['x-tenant-id'] = request.user.tenantId;
  }
  return headers;
}

function serializeBody(request: FastifyRequest): Buffer | null {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  if (request.body === undefined || request.body === null) return null;
  if (Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string') return Buffer.from(request.body);
  return Buffer.from(JSON.stringify(request.body));
}

async function callOnce(url: string, method: string, headers: Record<string, string>, body: Buffer | null) {
  return upstreamRequest(url, { method, headers, body });
}

export function createProxyHandler(service: ServiceName): RouteHandlerMethod {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const url = serviceUrl(service, request.raw.url || request.url);
    const headers = hopHeaders(request);
    const body = serializeBody(request);
    if (body && !headers['content-type']) headers['content-type'] = 'application/json';

    const idem = typeof request.headers['idempotency-key'] === 'string' ? request.headers['idempotency-key'] : null;
    if (idem && request.method !== 'GET') {
      const cacheKey = `${request.method}:${request.url}:${idem}`;
      const hit = idempotency.get(cacheKey);
      if (hit && hit.expires > Date.now()) {
        reply.header('X-Request-ID', request.requestId);
        return sendData(reply, hit.status, hit.body);
      }
    }

    let res;
    try {
      res = await callOnce(url, request.method, headers, body);
      if (SAFE.has(request.method) && res.statusCode >= 502) {
        res = await callOnce(url, request.method, headers, body);
      }
    } catch (err) {
      logger.error({ err, service, requestId: request.requestId, url }, 'upstream unreachable');
      throw new GatewayError(502, 'UPSTREAM_UNAVAILABLE', `Service ${service} is unreachable`, service);
    }

    const raw = Buffer.from(await res.body.arrayBuffer());
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      reply.header('Set-Cookie', cookies);
    }
    reply.header('X-Request-ID', request.requestId);

    let parsed: unknown = raw.length ? raw.toString('utf8') : null;
    const ct = String(res.headers['content-type'] || '');
    if (ct.includes('json') && typeof parsed === 'string' && parsed.length) {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        /* keep string */
      }
    }

    if (res.statusCode >= 400) {
      const msg =
        parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : `Upstream ${service} returned ${res.statusCode}`;
      return sendError(
        reply,
        res.statusCode,
        mapUpstreamStatus(res.statusCode),
        msg,
        service,
        request.requestId
      );
    }

    if (idem && request.method !== 'GET') {
      idempotency.set(`${request.method}:${request.url}:${idem}`, {
        status: res.statusCode,
        body: parsed,
        expires: Date.now() + 24 * 3600 * 1000,
      });
    }

    return sendData(reply, res.statusCode, parsed);
  };
}

export function mountProxy(app: FastifyInstance, prefix: string, service: ServiceName) {
  const handler = createProxyHandler(service);
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
  app.route({ method: [...methods], url: prefix, handler });
  app.route({ method: [...methods], url: `${prefix}/*`, handler });
}
