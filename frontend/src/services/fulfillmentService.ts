import { api, safeRequest } from './apiClient'
import { mockAdapter } from '../mocks/mockAdapter'
import type { FulfillmentPlan, WarehouseStock } from '../types/fulfillment'

export const fulfillmentService = {
  get: async (dealId: string): Promise<FulfillmentPlan> => {
    return safeRequest(
      () => api.get<FulfillmentPlan>(`/fulfillment/${dealId}`),
      () => mockAdapter.getFulfillment(dealId)
    )
  },

  getPlan: async (dealId: string): Promise<FulfillmentPlan> => {
    return fulfillmentService.get(dealId)
  },

  getStock: async (): Promise<WarehouseStock[]> => {
    return safeRequest(
      () => api.get<WarehouseStock[]>('/inventory/stock'),
      () => mockAdapter.listWarehouseStock()
    )
  },

  allocate: async (
    dealId: string,
    allocations: Array<{ warehouseName: string; quantity: number }>
  ): Promise<FulfillmentPlan> => {
    return safeRequest(
      () => api.post<FulfillmentPlan>(`/fulfillment/${dealId}/allocate`, { allocations }),
      () => mockAdapter.allocateFulfillment(dealId, allocations)
    )
  },

  commit: async (dealId: string): Promise<FulfillmentPlan> => {
    return safeRequest(
      () => api.post<FulfillmentPlan>(`/fulfillment/${dealId}/commit`),
      () => mockAdapter.getFulfillment(dealId)
    )
  },

  ship: async (dealId: string): Promise<FulfillmentPlan> => {
    return safeRequest(
      () => api.post<FulfillmentPlan>(`/fulfillment/${dealId}/ship`),
      async () => {
        const plan = await mockAdapter.getFulfillment(dealId)
        plan.lifecycleStep = 'Shipped'
        return plan
      }
    )
  },
}

export const inventoryService = {
  getStock: fulfillmentService.getStock,
}

export default fulfillmentService
