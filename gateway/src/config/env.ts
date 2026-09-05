import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().default(8000),
  JWT_SECRET: z.string().min(16).default('change-this-demo-secret-key-please-32-bytes-min'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  OEEG_WEBHOOK_KEY: z.string().default('oeeg-demo-key'),
  GATEWAY_DEMO_OEEG: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  GATEWAY_ENVELOPE: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  REDIS_URL: z.string().optional().default(''),
  LOG_LEVEL: z.string().default('info'),
  SERVICE_LOGIN: z.string().url().default('http://localhost:8080'),
  SERVICE_QUOTATION: z.string().url().default('http://localhost:8082'),
  SERVICE_DEAL: z.string().url().default('http://localhost:8083'),
  SERVICE_GOVERNANCE: z.string().url().default('http://localhost:8084'),
  SERVICE_APPROVAL: z.string().url().default('http://localhost:8085'),
  SERVICE_NEGOTIATION: z.string().url().default('http://localhost:8086'),
  SERVICE_INVENTORY: z.string().url().default('http://localhost:8087'),
  SERVICE_FULFILLMENT: z.string().url().default('http://localhost:8088'),
  SERVICE_RECOMMENDATION: z.string().url().default('http://localhost:8089'),
  SERVICE_DEAL_HEALTH: z.string().url().default('http://localhost:8090'),
  SERVICE_BILLING: z.string().url().default('http://localhost:8091'),
  SERVICE_OEEG: z.string().url().default('http://localhost:8092'),
});

export const env = Env.parse(process.env);
