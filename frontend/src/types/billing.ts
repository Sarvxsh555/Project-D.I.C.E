export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID'

/** Matches SubscriptionController.SubscriptionView exactly. */
export interface Subscription {
  id: string
  customerId: string
  dealId: string
  dealLineId: string
  planId: string
  startDate: string
  nextBillingDate: string
  status: SubscriptionStatus
}

/** Matches BillingEngine.Installment. */
export interface BillingInstallment {
  code: string
  label: string
  amount: number
  dueDate: string
}

/** Matches BillingEngine.LineItem. */
export interface BillingLineItem {
  sku: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

/** Matches BillingEngine.BillingSchedule exactly — GET /api/billing/{dealId}/schedule. */
export interface BillingSchedule {
  dealId: string
  currency: string
  totalAmount: number
  paymentTermsDays: number
  installments: BillingInstallment[]
  lineItems: BillingLineItem[]
}

/** Matches InvoiceController.InvoiceLineView. */
export interface InvoiceLine {
  sku: string | null
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

/** Matches InvoiceController.InvoiceView exactly. */
export interface Invoice {
  id: string
  dealId: string
  customerId: string
  subscriptionId: string | null
  status: InvoiceStatus
  currency: string
  totalAmount: number
  dueDate: string | null
  issuedAt: string | null
  paidAt: string | null
  lines: InvoiceLine[]
}

/** Matches PaymentController.PaymentView. */
export interface Payment {
  id: string
  invoiceId: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  amount: number
  currency: string
  transactionReference: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}
