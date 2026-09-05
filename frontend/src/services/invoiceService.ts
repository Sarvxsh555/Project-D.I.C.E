import { api } from './apiClient'
import type { Invoice, InvoiceStatus, Payment } from '../types/billing'

export const invoiceService = {
  /** GET /api/invoices — cross-deal ledger (InvoiceController.list). */
  list: async (status?: InvoiceStatus): Promise<Invoice[]> => {
    const res = await api.get<Invoice[]>('/invoices', { params: { status } })
    return res.data
  },

  listForDeal: async (dealId: string): Promise<Invoice[]> => {
    const res = await api.get<Invoice[]>(`/deals/${dealId}/invoices`)
    return res.data
  },

  get: async (id: string): Promise<Invoice> => {
    const res = await api.get<Invoice>(`/invoices/${id}`)
    return res.data
  },

  issue: async (id: string): Promise<Invoice> => {
    const res = await api.post<Invoice>(`/invoices/${id}/issue`)
    return res.data
  },

  /** There is no direct "mark paid" endpoint — status only ever changes as a
   *  side effect of a real payment (PaymentService), never from a caller-
   *  supplied target status. This records one. */
  recordPayment: async (invoiceId: string, amount: number, idempotencyKey: string): Promise<Payment> => {
    const res = await api.post<Payment>(`/invoices/${invoiceId}/payments`, { amount, idempotencyKey })
    return res.data
  },

  listPayments: async (invoiceId: string): Promise<Payment[]> => {
    const res = await api.get<Payment[]>(`/invoices/${invoiceId}/payments`)
    return res.data
  },

  refundPayment: async (paymentId: string): Promise<Payment> => {
    const res = await api.post<Payment>(`/payments/${paymentId}/refund`)
    return res.data
  },
}

export default invoiceService
