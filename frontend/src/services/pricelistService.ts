import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { PricelistItem } from '../types/product'

export const pricelistService = {
  list: async (): Promise<PricelistItem[]> => {
    return safeRequest(
      () => api.get<PricelistItem[]>('/pricelists'),
      () => mockAdapter.listPricelists()
    )
  },

  update: async (id: string, updates: Partial<PricelistItem>): Promise<PricelistItem> => {
    return safeRequest(
      () => api.patch<PricelistItem>(`/pricelists/${id}`, updates),
      () => mockAdapter.updatePricelist(id, updates)
    )
  },
}

export default pricelistService
