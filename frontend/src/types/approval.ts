import type { Role } from './auth'
import type { RiskLevel } from './deal'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES' | 'ESCALATED'

export interface ApprovalSnapshot {
  discountPercent: number
  marginPercent: number
  riskScore: number
  quantity: number
  paymentTerms: string
  approvedBy: string
  approvedAt: string
}

export interface ApprovalView {
  id: string
  dealId: string
  dealNumber: string
  customerName: string
  riskScore: number
  riskLevel: RiskLevel
  marginPercent: number
  totalAmount: number
  policyCode: string
  requiredRole: Role | string
  status: ApprovalStatus
  requestedBy: string
  reason: string
  requestedAt: string
  slaDueAt: string
  decidedAt?: string | null
  decidedBy?: string | null
  overdue: boolean
  snapshot?: ApprovalSnapshot
}

export interface DecisionPayload {
  comment?: string
  requestedChanges?: string
}

export interface DecisionRequest {
  action?: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'
  comment?: string
  changesRequested?: string
  requestedChanges?: string
}

