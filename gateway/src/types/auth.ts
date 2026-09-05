export type Role =
  | 'ADMIN'
  | 'SALES'
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'FINANCE'
  | 'CUSTOMER'
  | 'WAREHOUSE';

export type AuthUser = {
  sub: string;
  email?: string;
  role: Role;
  tenantId?: string;
  customerId?: number;
  jti?: string;
};
