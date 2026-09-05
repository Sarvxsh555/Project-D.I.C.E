export type DealStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVAL_REQUIRED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CUSTOMER_REVIEW'
  | 'NEGOTIATION'
  | 'COMMITTED'
  | 'CONFIRMED'
  | 'FULFILLED'
  | 'INVOICED'
  | 'PAID'
  | 'CANCELLED'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface DealLineItem {
  id: string
  productId?: string
  product: string
  productName?: string
  sku: string
  quantity: number
  unitPrice: number
  discountPercent: number
  taxPercent: number
  netAmount: number
  lineTotal?: number
  costPrice: number
  marginPercent: number
  billingType: 'ONE_TIME' | 'RECURRING'
  fulfillmentStatus?: string
  lineNumber?: number
  warehouseAllocations?: Array<{
    warehouseName: string
    quantity: number
  }>
}

export interface DealSummary {
  id: string
  dealNumber: string
  customerName: string
  totalAmount: number
  marginPercent: number
  riskScore: number
  riskLevel: RiskLevel
  status: DealStatus
  owner: string
  currency: string
  updatedAt: string
  createdAt: string
  portalToken?: string
  healthScore?: number
}

export interface DealDetail extends DealSummary {
  customerId: string
  customerTier: 'Bronze' | 'Silver' | 'Gold'
  paymentTerms: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  lines: DealLineItem[]
  notes?: string
  totalDiscountPercent?: number
}

export interface CreateQuotationPayload {
  customerId: string
  customerName?: string
  paymentTerms?: string
  lines: Array<{
    productId: string
    quantity: number
    unitPrice: number
    discountPercent: number
  }>
}

export type CreateDealRequest = CreateQuotationPayload

export interface ReplaceLinesRequest {
  lines: DealLineItem[]
}

export interface DiscountRequest {
  discountPercent: number
  reason?: string
}

export interface EvaluationSummary {
  score: number
  decision: 'APPROVAL_REQUIRED' | 'AUTO_APPROVED' | 'REJECTED'
  marginPercent: number
  riskScore: number
  factors: string[]
  policyViolations: string[]
  evaluatedAt: string
}

