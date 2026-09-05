import type { DealStatus, RiskLevel } from '../types/deal'
import type { ApprovalStatus } from '../types/approval'

export const DEAL_STATUS_STYLES: Record<DealStatus, { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  DRAFT: { label: 'Draft', variant: 'neutral' },
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  APPROVAL_REQUIRED: { label: 'Approval Required', variant: 'warning' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'primary' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  CUSTOMER_REVIEW: { label: 'Customer Review', variant: 'info' },
  NEGOTIATION: { label: 'In Negotiation', variant: 'warning' },
  COMMITTED: { label: 'Committed', variant: 'primary' },
  CONFIRMED: { label: 'Confirmed', variant: 'primary' },
  FULFILLED: { label: 'Fulfilled', variant: 'info' },
  INVOICED: { label: 'Invoiced', variant: 'info' },
  PAID: { label: 'Paid', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
}

export const RISK_LEVEL_STYLES: Record<RiskLevel, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  LOW: { label: 'Low Risk', variant: 'success' },
  MEDIUM: { label: 'Medium Risk', variant: 'warning' },
  HIGH: { label: 'High Risk', variant: 'danger' },
  CRITICAL: { label: 'Critical Risk', variant: 'danger' },
}

export const APPROVAL_STATUS_STYLES: Record<ApprovalStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  REQUEST_CHANGES: { label: 'Changes Requested', variant: 'info' },
  ESCALATED: { label: 'Escalated', variant: 'danger' },
}
