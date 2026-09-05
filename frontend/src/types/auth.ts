export type Role =
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'ADMIN'
  | 'CUSTOMER'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email: string
  fullName: string
  role: Role
  departmentOrCompany?: string
  territory?: string
  warehouseDepot?: string
}

export interface TokenResponse {
  token: string
  username: string
  roles: Role[]
  expiresInMs: number
}

export interface CurrentUser {
  username: string
  roles: Role[]
}

export interface UserSession {
  username: string
  role: Role
  token: string
  name: string
  email: string
  departmentOrCompany?: string
  territory?: string
  warehouseDepot?: string
}

export interface StakeholderDefinition {
  role: Role
  title: string
  subtitle: string
  description: string
  defaultDashboard: string
  allowedRoutes: string[]
  badgeVariant: 'primary' | 'success' | 'warning' | 'info' | 'neutral' | 'danger'
  demoUsername: string
}

export const STAKEHOLDER_DEFINITIONS: Record<Role, StakeholderDefinition> = {
  SALES_REP: {
    role: 'SALES_REP',
    title: 'Sales Representative',
    subtitle: 'Commercial Quotation & Deal Studio',
    description: 'Draft quotations, simulate line item discounts, manage customer counteroffers and track quota attainment.',
    defaultDashboard: '/dashboard',
    allowedRoutes: ['/', '/dashboard', '/quotations', '/negotiations', '/deal-health'],
    badgeVariant: 'primary',
    demoUsername: 'sales_rep',
  },
  SALES_MANAGER: {
    role: 'SALES_MANAGER',
    title: 'Sales Manager',
    subtitle: 'Escalations & Margin Governance Command',
    description: 'Review discount exceptions, monitor SLA countdowns, approve policy deviations, and audit team margin variance.',
    defaultDashboard: '/approvals',
    allowedRoutes: ['/', '/dashboard', '/approvals', '/quotations', '/negotiations', '/deal-health'],
    badgeVariant: 'warning',
    demoUsername: 'sales_manager',
  },
  FINANCE: {
    role: 'FINANCE',
    title: 'Finance & Controller',
    subtitle: 'Billing Milestones, AR & Cash Control',
    description: 'Oversee hybrid billing schedules, unbilled milestone releases, accounts receivable aging, and draft invoice dispatch.',
    defaultDashboard: '/billing',
    allowedRoutes: ['/', '/dashboard', '/billing', '/invoices', '/approvals', '/deal-health'],
    badgeVariant: 'info',
    demoUsername: 'finance',
  },
  OPERATIONS: {
    role: 'OPERATIONS',
    title: 'Operations & Logistics',
    subtitle: 'WMS Depot Allocations & Dispatch Hub',
    description: 'Manage warehouse inventory distribution across WH-A, WH-B, and WH-C, monitor backorders, and execute shipments.',
    defaultDashboard: '/fulfillment',
    allowedRoutes: ['/', '/dashboard', '/fulfillment'],
    badgeVariant: 'neutral',
    demoUsername: 'operations',
  },
  ADMIN: {
    role: 'ADMIN',
    title: 'Executive Admin',
    subtitle: 'Enterprise 360 Operations & Master Policy',
    description: 'Full administrative governance, systemic risk oversight, discount rule policy authoring, pricelists, and master products catalog.',
    defaultDashboard: '/dashboard',
    allowedRoutes: ['/', '/dashboard', '/quotations', '/approvals', '/fulfillment', '/billing', '/negotiations', '/invoices', '/deal-health', '/admin'],
    badgeVariant: 'danger',
    demoUsername: 'admin',
  },
  CUSTOMER: {
    role: 'CUSTOMER',
    title: 'Client Stakeholder',
    subtitle: 'Client Proposal & Negotiation Portal',
    description: 'Review formal commercial proposals, adjust counteroffer terms, digitally accept quotations, and inspect invoices.',
    defaultDashboard: '/portal',
    allowedRoutes: ['/portal'],
    badgeVariant: 'success',
    demoUsername: 'customer',
  },
}
