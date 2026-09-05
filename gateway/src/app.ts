import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import client from 'prom-client';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdHook } from './middleware/request-id.js';
import { authGuard } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { registerRateLimit } from './middleware/rate-limit.js';
import { authRoutes } from './routes/auth.routes.js';
import { quotationRoutes } from './routes/quotation.routes.js';
import { approvalRoutes } from './routes/approval.routes.js';
import { negotiationRoutes } from './routes/negotiation.routes.js';
import { dealRoutes } from './routes/deal.routes.js';
import { fulfillmentRoutes } from './routes/fulfillment.routes.js';
import { recommendationRoutes } from './routes/recommendation.routes.js';
import { dealHealthRoutes } from './routes/deal-health.routes.js';
import { billingRoutes } from './routes/billing.routes.js';
import { productsRoutes } from './routes/products.routes.js';
import { customersRoutes } from './routes/customers.routes.js';
import { oeegRoutes } from './routes/oeeg.routes.js';
import { diceRoutes } from './routes/dice.routes.js';
import { governanceRoutes } from './routes/governance.routes.js';
import { dataRoutes } from './routes/data.routes.js';
import { mountProxy } from './proxy/forward.js';

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpReq = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Gateway HTTP requests',
  labelNames: ['method', 'status'] as const,
  registers: [register],
});

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-Request-ID', 'X-OEEG-Key', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-ID', 'Set-Cookie'],
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'DealFlow360 API Gateway',
        version: '0.0.1',
        description:
          'Single front door. D.I.C.E. is quotation-service. OEEG only emulates Odoo events.',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/documentation' });

  await registerRateLimit(app);

  app.addHook('onRequest', requestIdHook);
  app.addHook('onSend', (request, reply, _payload, done) => {
    reply.header('X-Request-ID', request.requestId);
    done();
  });
  app.addHook('preHandler', authGuard);
  app.addHook('onResponse', (request, reply, done) => {
    httpReq.inc({ method: request.method, status: String(reply.statusCode) });
    done();
  });
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({
    status: 'ok',
    engine: 'D.I.C.E.',
    emulator: 'OEEG',
  }));
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  await authRoutes(app);
  await quotationRoutes(app);
  await productsRoutes(app);
  await customersRoutes(app);
  await diceRoutes(app);
  await approvalRoutes(app);
  await negotiationRoutes(app);
  await dealRoutes(app);
  await fulfillmentRoutes(app);
  await recommendationRoutes(app);
  await dealHealthRoutes(app);
  await billingRoutes(app);
  await oeegRoutes(app);
  await governanceRoutes(app);
  await dataRoutes(app);
  mountProxy(app, '/api/inventory', 'inventory');

  return app;
}
