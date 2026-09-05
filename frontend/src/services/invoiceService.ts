import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { Invoice } from '../types/billing'

export const invoiceService = {
  list: async (status?: string): Promise<Invoice[]> => {
    return safeRequest(
      () => api.get<Invoice[]>('/invoices', { params: { status } }),
      () => mockAdapter.listInvoices(status)
    )
  },

  listInvoices: async (status?: string): Promise<Invoice[]> => {
    return invoiceService.list(status)
  },

  get: async (id: string): Promise<Invoice> => {
    return safeRequest(
      () => api.get<Invoice>(`/invoices/${id}`),
      () => mockAdapter.getInvoice(id)
    )
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    return invoiceService.get(id)
  },

  issue: async (id: string): Promise<Invoice> => {
    return safeRequest(
      () => api.post<Invoice>(`/invoices/${id}/issue`),
      () => mockAdapter.issueInvoice(id)
    )
  },

  markPaid: async (id: string): Promise<Invoice> => {
    return safeRequest(
      () => api.post<Invoice>(`/invoices/${id}/mark-paid`),
      () => mockAdapter.markPaidInvoice(id)
    )
  },

  cancel: async (id: string): Promise<Invoice> => {
    return safeRequest(
      () => api.post<Invoice>(`/invoices/${id}/cancel`),
      () => mockAdapter.cancelInvoice(id)
    )
  },

  exportInvoicePdf: async (invoiceId: string): Promise<{ downloadUrl: string }> => {
    return {
      downloadUrl: `#export-${invoiceId}.pdf`,
    }
  },
}

export default invoiceService
