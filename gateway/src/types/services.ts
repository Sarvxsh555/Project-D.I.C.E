export type ServiceName =
  | 'login'
  | 'quotation'
  | 'deal'
  | 'governance'
  | 'approval'
  | 'negotiation'
  | 'inventory'
  | 'fulfillment'
  | 'recommendation'
  | 'dealHealth'
  | 'billing'
  | 'oeeg';

export type ServiceRegistry = Record<ServiceName, string>;
