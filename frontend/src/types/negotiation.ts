export interface NegotiationHistoryRecord {
  version: number
  actor: string
  discount: number
  total: number
  margin?: number
  risk?: number
  status: string
  message?: string
  timestamp: string
}

export interface NegotiationDetail {
  id: string
  dealId: string
  dealNumber: string
  customerName: string
  originalDiscountPercent: number
  customerRequestedDiscountPercent: number
  discountDifference: number
  customerMessage: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  history: NegotiationHistoryRecord[]
  // Internal metrics (strictly hidden in portal!)
  previousMarginPercent: number
  currentMarginPercent: number
  previousRiskScore: number
  currentRiskScore: number
  decision: 'APPROVAL_REQUIRED' | 'AUTO_APPROVED' | 'REJECTED'
  totalAmount?: number
}

export interface PortalQuoteView {
  token: string
  dealNumber: string
  customerName: string
  lines: Array<{
    productName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  totalAmount: number
  paymentTerms: string
  currentDiscountPercent: number
  totalDiscountPercent?: number
  status: string
  validUntil: string
}

export interface CounterofferPayload {
  requestedDiscountPercent: number
  message: string
}

export type CounterOfferRequest = CounterofferPayload

export interface PreviewResponse {
  total: number
  margin: number
  risk: number
  approvalRequired: boolean
  decision: 'APPROVAL_REQUIRED' | 'AUTO_APPROVED' | 'REJECTED'
  recommendation?: string
}

