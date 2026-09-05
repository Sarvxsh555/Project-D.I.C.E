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
  | 'oeeg'
  | 'data';

export type ServiceRegistry = Record<ServiceName, string>;
