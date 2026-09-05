import { api } from './api'

// TODO: mirror backend FulfillmentController.
export const fulfillmentService = {
  plan: (dealId: string) => api.get(`/fulfillment/${dealId}/plan`),
  commit: (dealId: string) => api.post(`/fulfillment/${dealId}/commit`),
}
