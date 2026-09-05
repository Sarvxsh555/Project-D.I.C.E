export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface Subscription {
  id: string
  dealId: string
  dealNumber: string
  customerName: string
  planName: string
  amount: number
  billingInterval: 'Monthly' | 'Quarterly' | 'Annual'
  startDate: string
  nextBillingDate: string
  status: SubscriptionStatus
}

export interface BillingChargeItem {
  id: string
  description: string
  type: 'ONE_TIME' | 'RECURRING'
  amount: number
  interval?: string
}

export interface BillingTimelineEntry {
  id: string
  date: string
  amount: number
  chargeType: 'ONE_TIME' | 'RECURRING'
  description: string
  status: 'PENDING' | 'INVOICED' | 'PAID'
}

export interface HybridBillingDetail {
  id: string
  dealId: string
  dealNumber: string
  customerName: string
  oneTimeTotal: number
  recurringMonthlyTotal: number
  discountAmount: number
  taxAmount: number
  netTotal: number
  charges: BillingChargeItem[]
  timeline: BillingTimelineEntry[]
}

export type BillingSchedule = HybridBillingDetail

export interface Invoice {
  id: string
  invoiceNumber: string
  dealId: string
  dealNumber: string
  customerName: string
  amount: number
  issueDate: string
  issuedDate?: string
  dueDate: string
  paidDate?: string | null
  status: InvoiceStatus
  currency?: string
  lines: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  tax: number
  discount: number
  total: number
}

