import { api, safeRequest } from './api'

export interface PricingRule {
  id: string
  name: string
  productCategory: string
  minVolume: number
  standardDiscountPercent: number
  maxRepDiscountPercent: number
}

export const pricingService = {
  getRules: async (): Promise<PricingRule[]> => {
    return safeRequest(
      () => api.get<PricingRule[]>('/pricing/rules'),
      async () => [
        {
          id: 'rule-1',
          name: 'Core Software Tier 1',
          productCategory: 'Software License',
          minVolume: 1,
          standardDiscountPercent: 5.0,
          maxRepDiscountPercent: 15.0,
        },
        {
          id: 'rule-2',
          name: 'Hardware Appliances Volume Tier',
          productCategory: 'Hardware & Appliance',
          minVolume: 5,
          standardDiscountPercent: 8.0,
          maxRepDiscountPercent: 12.0,
        },
      ]
    )
  },

  calculateMargin: (subtotal: number, cost: number): number => {
    if (subtotal <= 0) return 0
    return ((subtotal - cost) / subtotal) * 100
  },
}
