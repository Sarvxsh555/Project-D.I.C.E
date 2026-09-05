import type { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function registerRateLimit(app: FastifyInstance) {
  let redis;
  if (env.REDIS_URL) {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    try {
      await redis.connect();
      logger.info('rate-limit using Redis');
    } catch (err) {
      logger.warn({ err }, 'Redis unavailable — in-memory rate limit');
      redis = undefined;
    }
  }

  await app.register(import('@fastify/rate-limit'), {
    max: 300,
    timeWindow: '1 minute',
    redis,
    skipOnError: true,
    allowList: (req) => req.url.split('?')[0] === '/health' || req.url.startsWith('/documentation'),
  });
}
