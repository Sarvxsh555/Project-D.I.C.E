import {
  MOCK_CUSTOMERS,
  MOCK_PRODUCTS,
  MOCK_PRICELISTS,
  MOCK_DISCOUNT_RULES,
  MOCK_DEAL_SUMMARIES,
  MOCK_DEAL_DETAIL_Q1042,
  MOCK_APPROVALS_LIST,
  MOCK_FULFILLMENT_ORDERS,
  MOCK_BILLING_DETAILS,
  MOCK_INVOICES,
  MOCK_HEALTH_BREAKDOWNS,
  MOCK_POLICIES,
  MOCK_ANOMALIES,
  MOCK_NEGOTIATIONS,
  MOCK_PORTAL_QUOTES,
  MOCK_AUDIT_EVENTS,
  MOCK_WAREHOUSE_STOCK,
  MOCK_SUBSCRIPTIONS,
} from './mockDatabase'

import type { DealSummary, DealDetail } from '../types/deal'
import type { ApprovalView } from '../types/approval'
import type { FulfillmentPlan } from '../types/fulfillment'
import type { BillingSchedule } from '../types/billing'

export {
  MOCK_CUSTOMERS,
  MOCK_PRODUCTS,
  MOCK_PRICELISTS,
  MOCK_DISCOUNT_RULES,
  MOCK_INVOICES,
  MOCK_HEALTH_BREAKDOWNS,
  MOCK_POLICIES,
  MOCK_ANOMALIES,
  MOCK_NEGOTIATIONS,
  MOCK_PORTAL_QUOTES,
  MOCK_AUDIT_EVENTS,
  MOCK_WAREHOUSE_STOCK,
  MOCK_SUBSCRIPTIONS,
}

// Aliases for compatibility
export const MOCK_DEALS: DealSummary[] = MOCK_DEAL_SUMMARIES

export const MOCK_DEAL_DETAILS: Record<string, DealDetail> = {
  'd-1042': MOCK_DEAL_DETAIL_Q1042,
  'Q-1042': MOCK_DEAL_DETAIL_Q1042,
  'd1111111-1111-1111-1111-111111111111': MOCK_DEAL_DETAIL_Q1042,
  'd-1038': {
    ...MOCK_DEAL_DETAIL_Q1042,
    id: 'd-1038',
    dealNumber: 'Q-1038',
    customerName: 'Globex Industries',
    totalAmount: 185000,
    marginPercent: 17.4,
    riskScore: 55,
  },
  'd-1035': {
    ...MOCK_DEAL_DETAIL_Q1042,
    id: 'd-1035',
    dealNumber: 'Q-1035',
    customerName: 'Stark Systems',
    totalAmount: 920000,
    marginPercent: 28.0,
    riskScore: 32,
    status: 'NEGOTIATION',
  },
}

export const MOCK_APPROVALS: ApprovalView[] = MOCK_APPROVALS_LIST

export const MOCK_FULFILLMENT_PLANS: Record<string, FulfillmentPlan> = MOCK_FULFILLMENT_ORDERS

export const MOCK_BILLING_SCHEDULES: Record<string, BillingSchedule> = MOCK_BILLING_DETAILS
