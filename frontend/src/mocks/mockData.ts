import {
  MOCK_CUSTOMERS,
  MOCK_PRODUCTS,
  MOCK_PRICELISTS,
  MOCK_DISCOUNT_RULES,
  MOCK_DEAL_SUMMARIES,
  MOCK_DEAL_DETAIL_DL001,
  MOCK_APPROVALS_LIST,
  MOCK_FULFILLMENT_ORDERS,
  MOCK_BILLING_DETAILS,
  MOCK_INVOICES,
  MOCK_HEALTH_BREAKDOWNS,
  MOCK_POLICIES,
  MOCK_ANOMALIES,
  MOCK_DICE_DECISIONS,
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
  MOCK_DICE_DECISIONS,
  MOCK_NEGOTIATIONS,
  MOCK_PORTAL_QUOTES,
  MOCK_AUDIT_EVENTS,
  MOCK_WAREHOUSE_STOCK,
  MOCK_SUBSCRIPTIONS,
}

// Aliases for compatibility
export const MOCK_DEALS: DealSummary[] = MOCK_DEAL_SUMMARIES

export const MOCK_DEAL_DETAILS: Record<string, DealDetail> = {
  'd-2024-001': MOCK_DEAL_DETAIL_DL001,
  'DL-2024-001': MOCK_DEAL_DETAIL_DL001,
  'd1': MOCK_DEAL_DETAIL_DL001,
  'd-2024-002': {
    ...MOCK_DEAL_DETAIL_DL001,
    id: 'd-2024-002',
    dealNumber: 'DL-2024-002',
    customerName: 'Infosys Limited',
    totalAmount: 84075,
    marginPercent: 68.2,
    riskScore: 12,
    status: 'APPROVED',
  },
  'd-2024-003': {
    ...MOCK_DEAL_DETAIL_DL001,
    id: 'd-2024-003',
    dealNumber: 'DL-2024-003',
    customerName: 'Wipro Technologies',
    totalAmount: 146000,
    marginPercent: 58.4,
    riskScore: 28,
    status: 'CONFIRMED',
  },
}

export const MOCK_APPROVALS: ApprovalView[] = MOCK_APPROVALS_LIST

export const MOCK_FULFILLMENT_PLANS: Record<string, FulfillmentPlan> = MOCK_FULFILLMENT_ORDERS

export const MOCK_BILLING_SCHEDULES: Record<string, BillingSchedule> = MOCK_BILLING_DETAILS
