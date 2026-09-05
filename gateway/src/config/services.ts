import { env } from './env.js';
import type { ServiceRegistry } from '../types/services.js';

export const services: ServiceRegistry = {
  login: env.SERVICE_LOGIN,
  quotation: env.SERVICE_QUOTATION,
  deal: env.SERVICE_DEAL,
  governance: env.SERVICE_GOVERNANCE,
  approval: env.SERVICE_APPROVAL,
  negotiation: env.SERVICE_NEGOTIATION,
  inventory: env.SERVICE_INVENTORY,
  fulfillment: env.SERVICE_FULFILLMENT,
  recommendation: env.SERVICE_RECOMMENDATION,
  dealHealth: env.SERVICE_DEAL_HEALTH,
  billing: env.SERVICE_BILLING,
  oeeg: env.SERVICE_OEEG,
};
