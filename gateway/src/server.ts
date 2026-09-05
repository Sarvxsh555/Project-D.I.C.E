import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info(`gateway listening on :${env.PORT}  docs /documentation`);
} catch (err) {
  logger.error(err);
  process.exit(1);
}
