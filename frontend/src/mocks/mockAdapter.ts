import {
  MOCK_DEAL_SUMMARIES,
  MOCK_DEAL_DETAIL_Q1042,
  MOCK_APPROVALS_LIST,
  MOCK_PRODUCTS,
  MOCK_CUSTOMERS,
  MOCK_PRICELISTS,
  MOCK_DISCOUNT_RULES,
  MOCK_FULFILLMENT_ORDERS,
  MOCK_WAREHOUSE_STOCK,
  MOCK_BILLING_DETAILS,
  MOCK_SUBSCRIPTIONS,
  MOCK_HEALTH_BREAKDOWNS,
  MOCK_ANOMALIES,
  MOCK_HEALTH_SUMMARY,
  MOCK_POLICIES,
  MOCK_NEGOTIATIONS,
  MOCK_PORTAL_QUOTES,
  MOCK_AUDIT_EVENTS,
} from './mockDatabase'
import type { Page } from '../types/api'
import type { DealSummary, DealDetail, CreateDealRequest, DealStatus } from '../types/deal'
import type { ApprovalView, DecisionRequest, ApprovalSnapshot } from '../types/approval'
import type { FulfillmentPlan, WarehouseStock } from '../types/fulfillment'
import type { BillingSchedule, Subscription } from '../types/billing'
import type { HealthScoreBreakdown } from '../types/health'
import type { NegotiationDetail, PortalQuoteView, CounterofferPayload } from '../types/negotiation'
import type { Product, PricelistItem, DiscountRule, Customer, Policy } from '../types/product'
import type { AuditEvent } from '../types/audit'

function delay(ms = 80): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

import { DEMO_ACCOUNTS } from '../constants/roles'
import type { RegisterRequest, UserSession, TokenResponse } from '../types/auth'

// In-memory state for mutations during session
const usersStore: UserSession[] = JSON.parse(JSON.stringify(DEMO_ACCOUNTS))
const dealsStore: DealSummary[] = JSON.parse(JSON.stringify(MOCK_DEAL_SUMMARIES))
const dealDetailsStore: Record<string, DealDetail> = {
  'd-1042': JSON.parse(JSON.stringify(MOCK_DEAL_DETAIL_Q1042)),
  'Q-1042': JSON.parse(JSON.stringify(MOCK_DEAL_DETAIL_Q1042)),
}
const approvalsStore: ApprovalView[] = JSON.parse(JSON.stringify(MOCK_APPROVALS_LIST))
const fulfillmentStore: Record<string, FulfillmentPlan> = JSON.parse(JSON.stringify(MOCK_FULFILLMENT_ORDERS))
const warehouseStockStore: WarehouseStock[] = JSON.parse(JSON.stringify(MOCK_WAREHOUSE_STOCK))
const billingStore: Record<string, BillingSchedule> = JSON.parse(JSON.stringify(MOCK_BILLING_DETAILS))
const subscriptionsStore: Subscription[] = JSON.parse(JSON.stringify(MOCK_SUBSCRIPTIONS))
const negotiationsStore: Record<string, NegotiationDetail> = JSON.parse(JSON.stringify(MOCK_NEGOTIATIONS))
const portalQuotesStore: Record<string, PortalQuoteView> = JSON.parse(JSON.stringify(MOCK_PORTAL_QUOTES))
const productsStore: Product[] = JSON.parse(JSON.stringify(MOCK_PRODUCTS))
const pricelistsStore: PricelistItem[] = JSON.parse(JSON.stringify(MOCK_PRICELISTS))
const discountRulesStore: DiscountRule[] = JSON.parse(JSON.stringify(MOCK_DISCOUNT_RULES))
const auditEventsStore: Record<string, AuditEvent[]> = JSON.parse(JSON.stringify(MOCK_AUDIT_EVENTS))
const customersStore: Customer[] = JSON.parse(JSON.stringify(MOCK_CUSTOMERS))
const policiesStore: Policy[] = JSON.parse(JSON.stringify(MOCK_POLICIES))

export const mockAdapter = {
  // AUTHENTICATION & STAKEHOLDERS
  registerUser: async (req: RegisterRequest): Promise<TokenResponse> => {
    await delay()
    const token = `jwt-${req.username.toLowerCase()}-${Date.now()}`
    const newUser: UserSession = {
      username: req.username,
      name: req.fullName || req.username,
      email: req.email || `${req.username}@odoo-dice.internal`,
      role: req.role,
      token,
      departmentOrCompany: req.departmentOrCompany,
      territory: req.territory,
      warehouseDepot: req.warehouseDepot,
    }
    usersStore.push(newUser)
    return {
      token,
      username: req.username,
      roles: [req.role],
      expiresInMs: 86400000,
      fullName: newUser.name,
      email: newUser.email,
    }
  },

  listUsers: async (): Promise<UserSession[]> => {
    await delay()
    return usersStore
  },

  findUser: async (username: string): Promise<UserSession | undefined> => {
    await delay()
    return usersStore.find((u) => u.username.toLowerCase() === username.toLowerCase())
  },

  // DASHBOARD
  getDashboardSummary: async () => {
    await delay()
    const pendingApprovals = approvalsStore.filter((a) => a.status === 'PENDING').length
    const atRiskDeals = dealsStore.filter((d) => d.riskScore >= 70 || (d.healthScore && d.healthScore < 60)).length
    const activeNegotiations = dealsStore.filter((d) => d.status === 'NEGOTIATION').length || 3

    return {
      openQuotations: dealsStore.length,
      pendingApprovals: pendingApprovals || 5,
      atRiskDeals: atRiskDeals || 4,
      activeNegotiations,
      totalPipelineValue: dealsStore.reduce((sum, d) => sum + d.totalAmount, 0),
    }
  },

  getRecentActivity: async () => {
    await delay()
    return [
      {
        id: 'act-1',
        dealNumber: 'Q-1042',
        dealId: 'd-1042',
        customerName: 'Acme Corporation',
        action: 'Discount changed 12% → 18%',
        severity: 'HIGH',
        timeAgo: '10 minutes ago',
      },
      {
        id: 'act-2',
        dealNumber: 'Q-1038',
        dealId: 'd-1038',
        customerName: 'Globex Industries',
        action: 'Approval required (Margin < 20%)',
        severity: 'MEDIUM',
        timeAgo: '1 hour ago',
      },
      {
        id: 'act-3',
        dealNumber: 'Q-1035',
        dealId: 'd-1035',
        customerName: 'Stark Systems',
        action: 'Counteroffer received via portal',
        severity: 'LOW',
        timeAgo: '3 hours ago',
      },
    ]
  },

  getRiskActivity: async () => {
    await delay()
    return [
      {
        id: 'risk-1',
        dealNumber: 'Q-1042',
        customerName: 'Acme Corporation',
        riskLevel: 'HIGH',
        score: 86,
        trend: 'UP',
      },
      {
        id: 'risk-2',
        dealNumber: 'Q-1038',
        customerName: 'Globex Industries',
        riskLevel: 'MEDIUM',
        score: 55,
        trend: 'STABLE',
      },
      {
        id: 'risk-3',
        dealNumber: 'Q-1035',
        customerName: 'Stark Systems',
        riskLevel: 'LOW',
        score: 32,
        trend: 'DOWN',
      },
    ]
  },

  // QUOTATIONS / DEALS
  listDeals: async (params?: { status?: DealStatus; search?: string; page?: number; size?: number }): Promise<Page<DealSummary>> => {
    await delay()
    let filtered = [...dealsStore]
    if (params?.status) {
      filtered = filtered.filter((d) => d.status === params.status)
    }
    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter((d) => d.dealNumber.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q))
    }

    const pageSize = params?.size ?? 20
    const pageNumber = params?.page ?? 0
    const start = pageNumber * pageSize
    const content = filtered.slice(start, start + pageSize)

    return {
      content,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
      size: pageSize,
      number: pageNumber,
      first: pageNumber === 0,
      last: start + pageSize >= filtered.length,
      numberOfElements: content.length,
      empty: content.length === 0,
      pageable: { pageNumber, pageSize, offset: start, paged: true, unpaged: false },
    }
  },

  getDeal: async (id: string): Promise<DealDetail> => {
    await delay()
    if (dealDetailsStore[id]) return dealDetailsStore[id]
    const summary = dealsStore.find((d) => d.id === id || d.dealNumber === id)
    if (summary) {
      const detail: DealDetail = {
        ...summary,
        customerId: 'cust-acme',
        customerTier: 'Gold',
        paymentTerms: 'Net 30',
        subtotal: summary.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        lines: [
          {
            id: 'l-auto',
            lineNumber: 1,
            productId: productsStore[0].id,
            product: productsStore[0].name,
            productName: productsStore[0].name,
            sku: productsStore[0].sku,
            quantity: 1,
            unitPrice: summary.totalAmount,
            discountPercent: 0,
            taxPercent: 0,
            netAmount: summary.totalAmount,
            lineTotal: summary.totalAmount,
            costPrice: Math.round(summary.totalAmount * 0.75),
            marginPercent: summary.marginPercent,
            billingType: 'ONE_TIME',
          },
        ],
      }
      dealDetailsStore[id] = detail
      return detail
    }
    return dealDetailsStore['d-1042'] || MOCK_DEAL_DETAIL_Q1042
  },

  createDeal: async (payload: CreateDealRequest): Promise<DealDetail> => {
    await delay()
    const customer = customersStore.find((c) => c.id === payload.customerId) || customersStore[0]
    const nextNum = `Q-${1043 + dealsStore.length}`
    const id = `d-${nextNum.toLowerCase()}`

    let subtotal = 0
    let discountAmount = 0
    const lines = payload.lines.map((l, idx) => {
      const prod = productsStore.find((p) => p.id === l.productId) || productsStore[0]
      const unitPrice = l.unitPrice || prod.basePrice
      const disc = l.discountPercent || 0
      const net = Math.round(unitPrice * l.quantity * (1 - disc / 100))
      subtotal += unitPrice * l.quantity
      discountAmount += (unitPrice * l.quantity * disc) / 100

      return {
        id: `line-${id}-${idx + 1}`,
        lineNumber: idx + 1,
        productId: prod.id,
        product: prod.name,
        productName: prod.name,
        sku: prod.sku,
        quantity: l.quantity,
        unitPrice,
        discountPercent: disc,
        taxPercent: 0,
        netAmount: net,
        lineTotal: net,
        costPrice: prod.costPrice,
        marginPercent: Math.round(((net - prod.costPrice * l.quantity) / net) * 100),
        billingType: prod.billingType,
      }
    })

    const totalAmount = subtotal - discountAmount
    const detail: DealDetail = {
      id,
      dealNumber: nextNum,
      customerId: customer.id,
      customerName: customer.name,
      customerTier: 'Gold',
      paymentTerms: payload.paymentTerms || 'Net 30',
      totalAmount,
      subtotal,
      discountAmount,
      taxAmount: 0,
      marginPercent: 21.5,
      riskScore: 40,
      riskLevel: 'LOW',
      status: 'DRAFT',
      owner: 'Vikram Sharma',
      currency: 'INR',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lines,
    }

    dealDetailsStore[id] = detail
    dealsStore.unshift({
      id,
      dealNumber: nextNum,
      customerName: customer.name,
      totalAmount,
      marginPercent: 21.5,
      riskScore: 40,
      riskLevel: 'LOW',
      status: 'DRAFT',
      owner: 'Vikram Sharma',
      currency: 'INR',
      updatedAt: detail.updatedAt,
      createdAt: detail.createdAt,
    })

    return detail
  },

  updateDeal: async (id: string, updates: Partial<DealDetail>): Promise<DealDetail> => {
    await delay()
    const deal = await mockAdapter.getDeal(id)
    Object.assign(deal, updates)
    deal.updatedAt = new Date().toISOString()

    const summaryIdx = dealsStore.findIndex((d) => d.id === id || d.dealNumber === id)
    if (summaryIdx >= 0) {
      dealsStore[summaryIdx] = { ...dealsStore[summaryIdx], ...updates, updatedAt: deal.updatedAt }
    }
    return deal
  },

  submitDeal: async (id: string): Promise<DealDetail> => {
    return mockAdapter.updateDeal(id, { status: 'APPROVAL_REQUIRED' })
  },

  sendDealToCustomer: async (id: string): Promise<DealDetail> => {
    return mockAdapter.updateDeal(id, { status: 'CUSTOMER_REVIEW' })
  },

  cancelDeal: async (id: string): Promise<DealDetail> => {
    return mockAdapter.updateDeal(id, { status: 'CANCELLED' })
  },

  // APPROVALS
  listApprovals: async (tab?: string): Promise<ApprovalView[]> => {
    await delay()
    if (!tab || tab === 'ALL') return approvalsStore
    return approvalsStore.filter((a) => a.status === tab)
  },

  getApproval: async (id: string): Promise<ApprovalView> => {
    await delay()
    const item = approvalsStore.find((a) => a.id === id || a.dealId === id || a.dealNumber === id)
    if (!item) return approvalsStore[0]
    return item
  },

  approveApproval: async (id: string, req?: DecisionRequest): Promise<ApprovalView> => {
    await delay()
    const approval = await mockAdapter.getApproval(id)
    approval.status = 'APPROVED'
    approval.decidedAt = new Date().toISOString()
    approval.decidedBy = 'Priya Patel (Sales Manager)'

    // Create immutable snapshot
    const snapshot: ApprovalSnapshot = {
      discountPercent: 18,
      marginPercent: approval.marginPercent,
      riskScore: approval.riskScore,
      quantity: 21,
      paymentTerms: 'Net 30',
      approvedBy: 'Priya Patel (Sales Manager)',
      approvedAt: approval.decidedAt,
    }
    approval.snapshot = snapshot

    // Update connected deal
    await mockAdapter.updateDeal(approval.dealId, { status: 'APPROVED' })

    // Record audit event
    if (!auditEventsStore[approval.dealId]) auditEventsStore[approval.dealId] = []
    auditEventsStore[approval.dealId].push({
      id: `aud-${Date.now()}`,
      actor: 'Priya Patel (Sales Manager)',
      action: 'Approval Approved',
      timestamp: approval.decidedAt,
      previousValue: 'PENDING',
      newValue: 'APPROVED',
      reason: req?.comment || 'Approved with 18% discount exception based on strategic account expansion.',
    })

    return approval
  },

  rejectApproval: async (id: string, req?: DecisionRequest): Promise<ApprovalView> => {
    await delay()
    const approval = await mockAdapter.getApproval(id)
    approval.status = 'REJECTED'
    approval.decidedAt = new Date().toISOString()
    approval.decidedBy = 'Priya Patel (Sales Manager)'
    approval.reason = req?.comment || 'Discount exceeds maximum policy threshold.'

    await mockAdapter.updateDeal(approval.dealId, { status: 'REJECTED' })
    return approval
  },

  requestChangesApproval: async (id: string, req?: DecisionRequest): Promise<ApprovalView> => {
    await delay()
    const approval = await mockAdapter.getApproval(id)
    approval.status = 'REQUEST_CHANGES'
    approval.decidedAt = new Date().toISOString()
    approval.decidedBy = 'Priya Patel (Sales Manager)'
    approval.reason = req?.requestedChanges || req?.comment || 'Please reduce service discount to 10%.'

    await mockAdapter.updateDeal(approval.dealId, { status: 'DRAFT' })
    return approval
  },

  escalateApproval: async (id: string, req?: DecisionRequest): Promise<ApprovalView> => {
    await delay()
    const approval = await mockAdapter.getApproval(id)
    approval.status = 'ESCALATED'
    approval.decidedAt = new Date().toISOString()
    approval.decidedBy = 'Executive Governance Committee'
    approval.reason = req?.comment || 'Escalated to executive governance review.'

    return approval
  },

  // FULFILLMENT & INVENTORY
  getFulfillment: async (dealId: string): Promise<FulfillmentPlan> => {
    await delay()
    if (fulfillmentStore[dealId]) return fulfillmentStore[dealId]
    return fulfillmentStore['d-1042'] || MOCK_FULFILLMENT_ORDERS['d-1042']
  },

  listWarehouseStock: async (): Promise<WarehouseStock[]> => {
    await delay()
    return warehouseStockStore
  },

  allocateFulfillment: async (
    dealId: string,
    allocations: Array<{ warehouseName: string; quantity: number }>
  ): Promise<FulfillmentPlan> => {
    await delay()
    const plan = await mockAdapter.getFulfillment(dealId)
    if (plan.allocations[0]) {
      plan.allocations[0].warehouseAllocations = allocations
      plan.allocations[0].status = 'READY'
      plan.lifecycleStep = 'Allocated'
    }
    return plan
  },

  // BILLING & SUBSCRIPTIONS
  getBillingSchedule: async (dealId: string): Promise<BillingSchedule> => {
    await delay()
    if (billingStore[dealId]) return billingStore[dealId]
    return billingStore['d-1042'] || MOCK_BILLING_DETAILS['d-1042']
  },

  listSubscriptions: async (): Promise<Subscription[]> => {
    await delay()
    return subscriptionsStore
  },

  pauseSubscription: async (id: string): Promise<Subscription> => {
    await delay()
    const sub = subscriptionsStore.find((s) => s.id === id)
    if (sub) sub.status = 'PAUSED'
    return sub || subscriptionsStore[0]
  },

  cancelSubscription: async (id: string): Promise<Subscription> => {
    await delay()
    const sub = subscriptionsStore.find((s) => s.id === id)
    if (sub) sub.status = 'CANCELLED'
    return sub || subscriptionsStore[0]
  },

  // NEGOTIATIONS
  getNegotiation: async (dealId: string): Promise<NegotiationDetail> => {
    await delay()
    if (negotiationsStore[dealId]) return negotiationsStore[dealId]
    return negotiationsStore['d-1042'] || MOCK_NEGOTIATIONS['d-1042']
  },

  submitNegotiationCounteroffer: async (
    dealId: string,
    payload: CounterofferPayload
  ): Promise<NegotiationDetail> => {
    await delay()
    const neg = await mockAdapter.getNegotiation(dealId)
    neg.customerRequestedDiscountPercent = payload.requestedDiscountPercent
    neg.customerMessage = payload.message
    neg.status = 'PENDING_REVIEW'

    // Add immutable history record
    const nextVersion = neg.history.length + 1
    neg.history.push({
      version: nextVersion,
      actor: 'Acme Procurement (Customer)',
      discount: payload.requestedDiscountPercent,
      total: 412000,
      margin: 17.4,
      risk: 84,
      status: 'COUNTEROFFER_SUBMITTED',
      message: payload.message,
      timestamp: new Date().toISOString(),
    })

    // Re-evaluate deal
    neg.previousMarginPercent = 21.2
    neg.currentMarginPercent = 17.4
    neg.previousRiskScore = 64
    neg.currentRiskScore = 84
    neg.decision = 'APPROVAL_REQUIRED'

    // Update linked deal
    await mockAdapter.updateDeal(dealId, {
      status: 'APPROVAL_REQUIRED',
      riskScore: 84,
      marginPercent: 17.4,
    })

    return neg
  },

  // CUSTOMER PORTAL
  getPortalQuote: async (token: string): Promise<PortalQuoteView> => {
    await delay()
    if (portalQuotesStore[token]) return portalQuotesStore[token]
    return portalQuotesStore['portal-token-q1042-acme'] || MOCK_PORTAL_QUOTES['portal-token-q1042-acme']
  },

  acceptPortalQuote: async (token: string): Promise<{ success: boolean; message: string }> => {
    await delay()
    const quote = await mockAdapter.getPortalQuote(token)
    quote.status = 'CONFIRMED'
    await mockAdapter.updateDeal('d-1042', { status: 'CONFIRMED' })
    return { success: true, message: 'Quotation confirmed and accepted successfully!' }
  },

  rejectPortalQuote: async (token: string): Promise<{ success: boolean; message: string }> => {
    await delay()
    const quote = await mockAdapter.getPortalQuote(token)
    quote.status = 'CANCELLED'
    await mockAdapter.updateDeal('d-1042', { status: 'CANCELLED' })
    return { success: true, message: 'Quotation declined.' }
  },

  counterofferPortalQuote: async (token: string, payload: CounterofferPayload): Promise<PortalQuoteView> => {
    await delay()
    const quote = await mockAdapter.getPortalQuote(token)
    quote.currentDiscountPercent = payload.requestedDiscountPercent
    quote.status = 'NEGOTIATION'
    await mockAdapter.submitNegotiationCounteroffer('d-1042', payload)
    return quote
  },

  // DEAL HEALTH & ANOMALIES
  getHealthOverview: async () => {
    await delay()
    return MOCK_HEALTH_SUMMARY
  },

  listAnomalies: async () => {
    await delay()
    return MOCK_ANOMALIES
  },

  getHealthBreakdown: async (dealId: string): Promise<HealthScoreBreakdown> => {
    await delay()
    if (MOCK_HEALTH_BREAKDOWNS[dealId]) return MOCK_HEALTH_BREAKDOWNS[dealId]
    return MOCK_HEALTH_BREAKDOWNS['d-1042']
  },

  // ADMIN / CONFIGURATION
  listProducts: async (): Promise<Product[]> => {
    await delay()
    return productsStore
  },

  createProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    await delay()
    const newProd: Product = {
      ...product,
      id: `prod-${Date.now()}`,
    }
    productsStore.push(newProd)
    return newProd
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    await delay()
    const prod = productsStore.find((p) => p.id === id)
    if (prod) Object.assign(prod, updates)
    return prod || productsStore[0]
  },

  deleteProduct: async (id: string): Promise<void> => {
    await delay()
    const idx = productsStore.findIndex((p) => p.id === id)
    if (idx >= 0) productsStore.splice(idx, 1)
  },

  listPricelists: async (): Promise<PricelistItem[]> => {
    await delay()
    return pricelistsStore
  },

  updatePricelist: async (id: string, updates: Partial<PricelistItem>): Promise<PricelistItem> => {
    await delay()
    const item = pricelistsStore.find((p) => p.id === id)
    if (item) Object.assign(item, updates)
    return item || pricelistsStore[0]
  },

  listDiscountRules: async (): Promise<DiscountRule[]> => {
    await delay()
    return discountRulesStore
  },

  createDiscountRule: async (rule: Omit<DiscountRule, 'id'>): Promise<DiscountRule> => {
    await delay()
    const newRule: DiscountRule = {
      ...rule,
      id: `dr-${Date.now()}`,
    }
    discountRulesStore.push(newRule)
    return newRule
  },

  updateDiscountRule: async (id: string, updates: Partial<DiscountRule>): Promise<DiscountRule> => {
    await delay()
    const rule = discountRulesStore.find((r) => r.id === id)
    if (rule) Object.assign(rule, updates)
    return rule || discountRulesStore[0]
  },

  deleteDiscountRule: async (id: string): Promise<void> => {
    await delay()
    const idx = discountRulesStore.findIndex((r) => r.id === id)
    if (idx >= 0) discountRulesStore.splice(idx, 1)
  },

  getReportsSummary: async () => {
    await delay()
    return {
      totalDealValue: 4850000,
      averageDealValue: 485000,
      averageMargin: 22.8,
      discountRate: 14.2,
      approvalRate: 92.5,
      averageApprovalHours: 4.5,
      averageFulfillmentDays: 2.1,
      invoiceCollectionRate: 96.8,
      atRiskDealsCount: 4,
    }
  },

  // AUDIT TRAIL
  getAuditEvents: async (dealId: string): Promise<AuditEvent[]> => {
    await delay()
    return auditEventsStore[dealId] || auditEventsStore['d-1042'] || []
  },

  listCustomers: async (): Promise<Customer[]> => {
    await delay()
    return customersStore
  },

  listPolicies: async (): Promise<Policy[]> => {
    await delay()
    return policiesStore
  },
}


