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
    name: 'Arjun Mehta',
    email: 'arjun@dealflow.in',
    token: 'jwt-sales-rep',
  },
  {
    username: 'sales_manager',
    role: 'SALES_MANAGER',
    name: 'Priya Sharma',
    email: 'priya@dealflow.in',
    token: 'jwt-sales-mgr',
  },
  {
    username: 'finance',
    role: 'FINANCE',
    name: 'Rahul Gupta',
    email: 'rahul@dealflow.in',
    token: 'jwt-finance',
  },
  {
    username: 'operations',
    role: 'OPERATIONS',
    name: 'Sunita Patel',
    email: 'sunita@dealflow.in',
    token: 'jwt-operations',
  },
  {
    username: 'admin',
    role: 'ADMIN',
    name: 'Vikram Singh',
    email: 'vikram@dealflow.in',
    token: 'jwt-admin',
  },
  {
    username: 'customer',
    role: 'CUSTOMER',
    name: 'Anjali Customer',
    email: 'anjali@corp.in',
    token: 'jwt-customer',
  },
]
