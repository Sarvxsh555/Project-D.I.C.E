export type BillingType = 'ONE_TIME' | 'RECURRING'
export type CustomerTier = 'Bronze' | 'Silver' | 'Gold'

export interface Product {
  id: string
  sku: string
  name: string
  category: 'Footwear & Shoes' | 'Toys & Games' | 'Consumer Electronics' | 'Enterprise Hardware' | 'Apparel & Sportswear' | 'Hardware' | 'Service' | 'Infrastructure' | 'Software' | string
  basePrice: number
  costPrice: number
  billingType: BillingType
  status: 'ACTIVE' | 'ARCHIVED'
  description?: string
  imageUrl?: string
  taxPercent?: number
}

export interface PricelistItem {
  id: string
  tier: CustomerTier
  productId: string
  productName: string
  sku: string
  tierPrice: number
  effectiveFrom: string
  effectiveTo: string
}

export interface DiscountRule {
  id: string
  ruleName: string
  customerTier: CustomerTier | 'All'
  category: string
  maxDiscountPercent: number
  riskThreshold: number
  approvalLevel: 'None' | 'Sales Manager' | 'Sales Manager + Finance' | 'VP of Sales'
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  effectiveDate: string
  version: string
}
export interface Customer {
  id: string
  name: string
  segment: 'ENTERPRISE' | 'STRATEGIC' | 'MID_MARKET' | 'SMB'
  creditLimit: number
  creditUsed: number
  paymentTerms: string
  riskScore: number
}

export interface Policy {
  id: string
  code: string
  name: string
  category?: string
  type?: string
  severity?: string
  thresholdValue?: number
  action?: 'AUTO_APPROVE' | 'FLAG_REVIEW' | 'BLOCK'
  requiredRole?: string
  description?: string
  active?: boolean
}


