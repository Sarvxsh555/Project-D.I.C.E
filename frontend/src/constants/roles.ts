import type { Role, UserSession } from '../types/auth'

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

export const DEMO_ACCOUNTS: UserSession[] = [
  {
    username: 'sales_rep',
    role: 'SALES_REP',
    name: 'Sarah Jenkins',
    email: 'sarah.j@odoo-dice.internal',
    token: 'mock-jwt-sales-rep',
  },
  {
    username: 'sales_manager',
    role: 'SALES_MANAGER',
    name: 'Marcus Vance',
    email: 'marcus.v@odoo-dice.internal',
    token: 'mock-jwt-sales-mgr',
  },
  {
    username: 'finance',
    role: 'FINANCE',
    name: 'Elena Rostova',
    email: 'elena.r@odoo-dice.internal',
    token: 'mock-jwt-finance',
  },
  {
    username: 'operations',
    role: 'OPERATIONS',
    name: 'David Chen',
    email: 'david.c@odoo-dice.internal',
    token: 'mock-jwt-operations',
  },
  {
    username: 'admin',
    role: 'ADMIN',
    name: 'System Admin',
    email: 'admin@odoo-dice.internal',
    token: 'mock-jwt-admin',
  },
  {
    username: 'customer',
    role: 'CUSTOMER',
    name: 'Apex Corp Lead',
    email: 'buyer@apexcorp.com',
    token: 'mock-jwt-customer',
  },
]
