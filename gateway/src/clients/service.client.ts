import { services } from '../config/services.js';
import type { ServiceName } from '../types/services.js';

export function serviceUrl(name: ServiceName, pathAndQuery: string): string {
  const base = services[name].replace(/\/$/, '');
  const path = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return `${base}${path}`;
}
