import type { Role } from '../types/auth'

export const ROLES: Record<Role, { label: string; description: string }> = {
  SALES_REP: {
    label: 'Sales Representative',
    description: 'Create quotations, negotiate terms, and submit deals for review.',
  },
  SALES_MANAGER: {
    label: 'Sales Manager',
    description: 'Review discounts, approve exceptions, and oversee pipeline health.',
  },
  FINANCE: {
    label: 'Finance Specialist',
    description: 'Manage credit limits, payment schedules, and draft invoices.',
  },
  OPERATIONS: {
    label: 'Operations Specialist',
    description: 'Oversee warehouse allocations, fulfillment planning, and shipments.',
  },
  ADMIN: {
    label: 'System Administrator',
    description: 'Full governance, policy rule definition, and emulator control.',
  },
  CUSTOMER: {
    label: 'Customer Reviewer',
    description: 'View customer-facing proposal and countersign terms.',
  },
}

/**
 * The six seeded demo accounts (see DevDataSeeder / docs/demo-flow.md) — just
 * enough to drive the "quick switch stakeholder" UI. Deliberately carries no
 * name/email/token: those are real profile fields that only the backend
 * knows, fetched fresh on every login/switch rather than hardcoded here.
 */
export interface DemoAccountRef {
  username: string
  role: Role
}

export const DEMO_ACCOUNTS: DemoAccountRef[] = [
  { username: 'sales_rep', role: 'SALES_REP' },
  { username: 'sales_manager', role: 'SALES_MANAGER' },
  { username: 'finance', role: 'FINANCE' },
  { username: 'operations', role: 'OPERATIONS' },
  { username: 'admin', role: 'ADMIN' },
  { username: 'customer', role: 'CUSTOMER' },
]

/** Every demo account shares this password — see docs/demo-flow.md. */
export const DEMO_PASSWORD = 'dice-demo'
