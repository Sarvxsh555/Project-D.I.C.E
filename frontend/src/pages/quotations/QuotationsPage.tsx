import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import {
  DealHeader,
  DealLineTable,
  PricingSummary,
  DiceDecisionBlock,
  DiceSimulationDrawer,
  WarehouseAllocationView,
  HybridBillingView,
} from '../../components/domain'
import { quotationService } from '../../services/quotationService'
import { fulfillmentService } from '../../services/fulfillmentService'
import { billingService } from '../../services/billingService'
import { productService } from '../../services/productService'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { DealSummary, DealDetail, DealStatus, DealLineItem } from '../../types/deal'
import type { DiceDecision } from '../../types/dice'
import type { ApprovalView } from '../../types/approval'
import type { FulfillmentPlan, WarehouseStock } from '../../types/fulfillment'
import type { BillingSchedule } from '../../types/billing'
import type { Product, Customer } from '../../types/product'
import { approvalService } from '../../services/approvalService'
import {
  Table as TableIcon,
  Columns,
  Plus,
  Search,
  ArrowLeft,
  ExternalLink,
  Clock,
  Building2,
  CheckCircle2,
} from 'lucide-react'

export default function QuotationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dealParam = searchParams.get('id')
  const actionParam = searchParams.get('action')

  // List State
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [customerFilter, setCustomerFilter] = useState<string>('ALL')
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL')
  const [riskFilter, setRiskFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Deal Workspace State
  const [activeDeal, setActiveDeal] = useState<DealDetail | null>(null)
  const [diceDecision, setDiceDecision] = useState<DiceDecision | null>(null)
  const [approval, setApproval] = useState<ApprovalView | null>(null)
  const [fulfillment, setFulfillment] = useState<FulfillmentPlan | null>(null)
  const [stock, setStock] = useState<WarehouseStock[]>([])
  const [billing, setBilling] = useState<BillingSchedule | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)

  // Simulation Drawer
  const [isSimOpen, setIsSimOpen] = useState(false)

  // New Deal Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(20)
  const [disc, setDisc] = useState(12)

  // Fetch Quotation List
  const loadDeals = async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await quotationService.list({
        status: statusFilter === 'ALL' ? undefined : (statusFilter as DealStatus),
      })
      setDeals(page.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quotations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeals()
  }, [statusFilter])

  // Load specific Deal Workspace if `?id=` param is set
  useEffect(() => {
    if (!dealParam) {
      setActiveDeal(null)
      return
    }

    const loadWorkspace = async () => {
      setWorkspaceLoading(true)
      try {
        const [dealData, decisionData, appData, fulData, stockData, billData] =
          await Promise.all([
            quotationService.get(dealParam),
            quotationService.getDecision(dealParam).catch(() => null),
            approvalService.get(dealParam).catch(() => null),
            fulfillmentService.get(dealParam).catch(() => null),
            fulfillmentService.getStock().catch(() => []),
            billingService.getSchedule(dealParam).catch(() => null),
          ])

        setActiveDeal(dealData)
        setDiceDecision(decisionData)
        setApproval(appData)
        setFulfillment(fulData)
        setStock(stockData)
        setBilling(billData)
      } catch (err) {
        console.error('Failed to load deal detail', err)
      } finally {
        setWorkspaceLoading(false)
      }
    }

    loadWorkspace()
  }, [dealParam])

  // Open create modal if action=new
  useEffect(() => {
    if (actionParam === 'new') {
      handleOpenCreate()
    }
  }, [actionParam])

  const handleOpenCreate = async () => {
    setIsCreateOpen(true)
    try {
      const [cList, pList] = await Promise.all([
        productService.listCustomers(),
        productService.list(),
      ])
      setCustomers(cList)
      setProducts(pList)
      if (cList.length > 0) setSelectedCustomerId(cList[0].id)
      if (pList.length > 0) setSelectedProductId(pList[0].id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newDeal = await quotationService.create({
        customerId: selectedCustomerId,
        lines: [
          {
            productId: selectedProductId,
            quantity: qty,
            unitPrice: products.find((p) => p.id === selectedProductId)?.basePrice || 20000,
            discountPercent: disc,
          },
        ],
      })
      setIsCreateOpen(false)
      loadDeals()
      setSearchParams({ id: newDeal.id })
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateLine = (lineId: string, updates: Partial<DealLineItem>) => {
    if (!activeDeal) return
    const updatedLines = activeDeal.lines.map((l) => {
      if (l.id === lineId) {
        const newLine = { ...l, ...updates }
        const unit = newLine.unitPrice || 20000
        const q = newLine.quantity || 1
        const d = newLine.discountPercent || 0
        const sub = unit * q * (1 - d / 100)
        newLine.lineTotal = sub
        newLine.netAmount = sub * 1.18
        return newLine
      }
      return l
    })

    const total = updatedLines.reduce((acc, l) => acc + (l.netAmount || l.lineTotal || 0), 0)
    const cost = updatedLines.reduce((acc, l) => acc + (l.costPrice || 15000) * l.quantity, 0)
    const margin = total > 0 ? ((total - cost) / total) * 100 : 20

    setActiveDeal({
      ...activeDeal,
      lines: updatedLines,
      totalAmount: total,
      marginPercent: Math.round(margin * 10) / 10,
    })
  }

  const handleApplySimulatedChanges = async (changes: {
    discount: number
    quantity: number
    paymentTerms: string
  }) => {
    if (!activeDeal) return
    const updated = await quotationService.update(activeDeal.id, {
      paymentTerms: changes.paymentTerms,
      marginPercent: changes.discount <= 10 ? 22.4 : 18.4,
      riskScore: changes.discount <= 10 ? 35 : 84,
      status: changes.discount <= 10 ? 'APPROVED' : 'APPROVAL_REQUIRED',
    })
    setActiveDeal(updated)
    const newDecision = await quotationService.getDecision(activeDeal.id)
    setDiceDecision(newDecision)
    loadDeals()
  }

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchesSearch =
        d.dealNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter
      const matchesCustomer = customerFilter === 'ALL' || d.customerName.toLowerCase().includes(customerFilter.toLowerCase())
      const matchesOwner = ownerFilter === 'ALL' || (d.owner && d.owner.toLowerCase().includes(ownerFilter.toLowerCase()))
      const matchesRisk =
        riskFilter === 'ALL' ||
        (riskFilter === 'LOW' && d.riskScore < 50) ||
        (riskFilter === 'MEDIUM' && d.riskScore >= 50 && d.riskScore <= 75) ||
        (riskFilter === 'HIGH' && d.riskScore > 75)

      return matchesSearch && matchesStatus && matchesCustomer && matchesOwner && matchesRisk
    })
  }, [deals, searchQuery, statusFilter, customerFilter, ownerFilter, riskFilter])

  // ==========================================
  // RENDER: DEAL RECORD WORKSPACE (DETAIL VIEW)
  // ==========================================
  if (dealParam) {
    if (workspaceLoading || !activeDeal) {
      return <LoadingState message={`Loading Quotation ${dealParam} Record...`} rows={6} />
    }

    return (
      <div className="space-y-4">
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Quotations</span>
          </Button>

          <Link
            to={`/portal/quotes/${activeDeal.portalToken || 'portal-token-q1042-acme'}`}
            target="_blank"
            className="text-xs font-semibold text-[#5E2A52] flex items-center gap-1 hover:underline"
          >
            <span>Customer Portal Proposal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Real Quotation Record Header */}
        <DealHeader
          deal={activeDeal}
          onSimulate={() => setIsSimOpen(true)}
          onSendToCustomer={async () => {
            const res = await quotationService.sendToCustomer(activeDeal.id)
            setActiveDeal(res)
          }}
          onSubmit={async () => {
            const res = await quotationService.submit(activeDeal.id)
            setActiveDeal(res)
          }}
        />

        {/* STRUCTURED TWO-COLUMN ENTERPRISE RECORD LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Customer, Lines, Pricing, Fulfillment, Billing */}
          <div className="lg:col-span-8 space-y-5">
            {/* 1. Customer & Account Specifications */}
            <div className="border border-slate-200 rounded bg-white p-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Customer Information & Credit Terms
                </span>
                <Badge variant="neutral" size="sm">
                  {activeDeal.customerTier || 'Enterprise'} Tier
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Client</span>
                  <strong className="text-slate-900">{activeDeal.customerName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Payment Terms</span>
                  <span className="font-mono text-slate-900">{activeDeal.paymentTerms || 'Net-30 Days'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Credit Limit</span>
                  <span className="font-mono text-slate-900">₹10,00,000</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Credit Utilization</span>
                  <span className="font-mono text-slate-900">43.4% (Healthy)</span>
                </div>
              </div>
            </div>

            {/* 2. Quotation Lines Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-bold text-slate-800">
                  Quotation Product & Service Lines
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {activeDeal.lines.length} Line Items
                </span>
              </div>
              <DealLineTable
                lines={activeDeal.lines}
                editable={true}
                onUpdateLine={handleUpdateLine}
                onAddLine={() => {
                  const newLine: DealLineItem = {
                    id: `line-${Date.now()}`,
                    lineNumber: activeDeal.lines.length + 1,
                    product: 'Enterprise Consulting Hours',
                    productName: 'Enterprise Consulting Hours',
                    sku: 'SVC-CNS-002',
                    quantity: 10,
                    unitPrice: 5000,
                    discountPercent: 10,
                    taxPercent: 18,
                    lineTotal: 45000,
                    netAmount: 53100,
                    costPrice: 3000,
                    marginPercent: 33.3,
                    billingType: 'ONE_TIME',
                  }
                  setActiveDeal({
                    ...activeDeal,
                    lines: [...activeDeal.lines, newLine],
                    totalAmount: activeDeal.totalAmount + 53100,
                  })
                }}
                onRemoveLine={(lineId) => {
                  if (activeDeal.lines.length <= 1) return
                  const remaining = activeDeal.lines.filter((l) => l.id !== lineId)
                  setActiveDeal({
                    ...activeDeal,
                    lines: remaining,
                    totalAmount: remaining.reduce((acc, l) => acc + (l.netAmount || l.lineTotal || 0), 0),
                  })
                }}
              />
            </div>

            {/* 3. Pricing Summary & Financial Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="border border-slate-200 rounded bg-white p-3.5 space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-800 block">
                  Contractual Notes & Governance Directives
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeDeal.notes ||
                    'Standard commercial terms. Multi-depot fulfillment authorized subject to manager approval of services discount ceiling. Net-30 invoicing with Net-45 counteroffer request recorded.'}
                </p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                  Tax Regime: GST 18% Dual Interstate • Currency: INR (₹)
                </div>
              </div>

              <div>
                <PricingSummary deal={activeDeal} />
              </div>
            </div>

            {/* 4. Fulfillment & Warehouse Allocation Preview */}
            {fulfillment && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-800">
                    WMS Fulfillment Depot Allocation
                  </h3>
                  <Badge variant="neutral" size="sm">
                    Depot Status: Ready for Dispatch
                  </Badge>
                </div>
                <WarehouseAllocationView
                  plan={fulfillment}
                  stock={stock}
                  onAcceptSuggested={async () => {
                    await fulfillmentService.allocate(activeDeal.id, [
                      { warehouseName: 'Warehouse A (Mumbai Central)', quantity: 12 },
                      { warehouseName: 'Warehouse B (Bengaluru Tech Hub)', quantity: 8 },
                    ])
                    const updated = await fulfillmentService.get(activeDeal.id)
                    setFulfillment(updated)
                  }}
                />
              </div>
            )}

            {/* 5. Billing Schedule Table Preview */}
            {billing && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-800">
                    Billing Milestones & Revenue Schedule
                  </h3>
                  <Badge variant="info" size="sm">
                    Milestone Schedule
                  </Badge>
                </div>
                <HybridBillingView
                  billing={billing}
                  onGenerateInvoice={async () => {
                    await billingService.generateInvoice(activeDeal.id)
                    alert('Milestone Invoice generated successfully! View in Invoices tab.')
                  }}
                />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DICE DECISION, Approval Status, Financial Summary */}
          <div className="lg:col-span-4 space-y-4">
            {/* DICE DECISION Panel */}
            {diceDecision ? (
              <DiceDecisionBlock
                decision={diceDecision}
                onSimulate={() => setIsSimOpen(true)}
              />
            ) : (
              <div className="border border-slate-200 rounded p-4 bg-white text-xs text-slate-500">
                DICE Decision pending line calculation.
              </div>
            )}

            {/* Approval Status Card */}
            <div className="border border-slate-200 rounded bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-800">
                  Governance Signoff
                </span>
                <Badge
                  variant={
                    activeDeal.status === 'APPROVED'
                      ? 'success'
                      : activeDeal.status === 'APPROVAL_REQUIRED'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {activeDeal.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Required Role:</span>
                  <strong className="text-slate-800">{approval?.requiredRole || 'Sales Manager'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">SLA Countdown:</span>
                  <span className="font-mono font-semibold text-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    03h : 48m remaining
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trigger:</span>
                  <span className="text-slate-700 text-right">{approval?.reason || 'Service discount (22%) > 15%'}</span>
                </div>
                {approval && (
                  <div className="text-[11px] bg-slate-50 border border-slate-200 rounded p-2 text-slate-600">
                    <span className="font-semibold text-slate-800">Policy: {approval.policyCode}</span>
                  </div>
                )}
              </div>

              {activeDeal.status === 'APPROVAL_REQUIRED' && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full bg-[#5E2A52] hover:bg-[#4B2141] text-xs flex items-center justify-center gap-1.5"
                    onClick={async () => {
                      const res = await quotationService.update(activeDeal.id, { status: 'APPROVED' })
                      setActiveDeal(res)
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Exception
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-rose-700 border-slate-300 hover:bg-rose-50"
                    onClick={async () => {
                      const res = await quotationService.update(activeDeal.id, { status: 'DRAFT' })
                      setActiveDeal(res)
                    }}
                  >
                    Request Changes
                  </Button>
                </div>
              )}
            </div>

            {/* Financial Summary Box */}
            <div className="border border-slate-200 rounded bg-white p-3.5 text-xs space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-800 block">
                Deal Financial Snapshot
              </span>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Gross Value:</span>
                  <span className="font-mono font-medium">{formatCurrency(activeDeal.totalAmount * 1.15)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Concessions (Discounts):</span>
                  <span className="font-mono text-amber-700 font-medium">- {formatCurrency(activeDeal.totalAmount * 0.15)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Net Proposal:</span>
                  <span className="font-mono">{formatCurrency(activeDeal.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Blended Margin:</span>
                  <span className="font-mono font-bold">{formatPercent(activeDeal.marginPercent)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simulation Drawer */}
        <DiceSimulationDrawer
          isOpen={isSimOpen}
          onClose={() => setIsSimOpen(false)}
          deal={activeDeal}
          onApplyChanges={handleApplySimulatedChanges}
        />
      </div>
    )
  }

  // ==========================================
  // RENDER: QUOTATIONS LIST (TABLE-FIRST)
  // ==========================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quotations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage commercial proposals, line item pricing, and DICE governance approvals
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white text-[#5E2A52] font-semibold' : 'text-slate-600'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-[#5E2A52] font-semibold' : 'text-slate-600'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="bg-[#5E2A52] hover:bg-[#4B2141] text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-2.5 rounded border border-slate-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations by ID, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVAL_REQUIRED">Approval Required</option>
            <option value="APPROVED">Approved</option>
            <option value="NEGOTIATION">In Negotiation</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>

          {/* Customer Filter */}
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="ALL">All Customers</option>
            <option value="Acme">Acme Corporation</option>
            <option value="Globex">Globex Logistics</option>
            <option value="Stark">Stark Industries</option>
            <option value="Apex">Apex Corp</option>
            <option value="Zenith">Zenith Tech</option>
          </select>

          {/* Owner Filter */}
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="ALL">All Owners</option>
            <option value="Sarah">Sarah Jenkins</option>
            <option value="Arun">Arun</option>
            <option value="Priya">Priya</option>
            <option value="Marcus">Marcus Vance</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#5E2A52]"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk (&lt;50)</option>
            <option value="MEDIUM">Medium Risk (50-75)</option>
            <option value="HIGH">High Risk (&gt;75)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading quotation pipeline..." rows={6} />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={loadDeals} />
      ) : filteredDeals.length === 0 ? (
        <EmptyState
          title="No Quotations Found"
          description="Try adjusting your search criteria or create a new quotation."
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW - PRIORITIZED ENTERPRISE DATA TABLE */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Quotation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-32" align="right">Amount</TableHead>
              <TableHead className="w-24" align="right">Margin</TableHead>
              <TableHead className="w-20" align="right">Risk</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-32">Owner</TableHead>
              <TableHead className="w-28">Last Updated</TableHead>
              <TableHead className="w-24" align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeals.map((d) => {
              const statusVariant =
                d.status === 'APPROVED' || d.status === 'CONFIRMED'
                  ? 'success'
                  : d.status === 'APPROVAL_REQUIRED' || d.status === 'NEGOTIATION'
                  ? 'warning'
                  : d.status === 'REJECTED'
                  ? 'danger'
                  : 'neutral'

              const statusLabel =
                d.status === 'APPROVAL_REQUIRED'
                  ? 'Approval Required'
                  : d.status === 'NEGOTIATION'
                  ? 'In Negotiation'
                  : d.status === 'CUSTOMER_REVIEW'
                  ? 'Customer Review'
                  : d.status

              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ id: d.id })}
                      className="font-mono font-bold text-[#5E2A52] hover:underline cursor-pointer text-left"
                    >
                      {d.dealNumber}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {d.customerName}
                  </TableCell>
                  <TableCell align="right" className="font-bold text-slate-900 font-mono">
                    {formatCurrency(d.totalAmount)}
                  </TableCell>
                  <TableCell align="right">
                    <span
                      className={`font-mono ${
                        d.marginPercent >= 20 ? 'text-emerald-700' : 'text-rose-700 font-semibold'
                      }`}
                    >
                      {formatPercent(d.marginPercent)}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span
                      className={`font-mono font-bold ${
                        d.riskScore >= 75 ? 'text-rose-700' : d.riskScore >= 50 ? 'text-amber-700' : 'text-slate-700'
                      }`}
                    >
                      {d.riskScore}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant} size="sm">
                      {statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {d.owner || 'Arun'}
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">
                    {d.dealNumber === 'Q-1042' ? 'Today' : 'Yesterday'}
                  </TableCell>
                  <TableCell align="right">
                    <button
                      type="button"
                      onClick={() => setSearchParams({ id: d.id })}
                      className="px-2 py-1 text-xs border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Open
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        /* KANBAN VIEW (Secondary View) */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {['DRAFT', 'SUBMITTED', 'APPROVAL_REQUIRED', 'APPROVED', 'REJECTED'].map((colStatus) => {
            const colDeals = filteredDeals.filter((d) => d.status === colStatus)
            return (
              <div key={colStatus} className="border border-slate-200 bg-slate-50 rounded p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
                  <span>{colStatus.replace('_', ' ')}</span>
                  <span className="font-mono text-slate-400">({colDeals.length})</span>
                </div>
                <div className="space-y-2">
                  {colDeals.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setSearchParams({ id: d.id })}
                      className="p-2.5 bg-white border border-slate-200 rounded cursor-pointer hover:border-[#5E2A52] text-xs space-y-1"
                    >
                      <div className="font-mono font-bold text-[#5E2A52]">{d.dealNumber}</div>
                      <div className="font-medium text-slate-900">{d.customerName}</div>
                      <div className="font-mono font-bold">{formatCurrency(d.totalAmount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Quotation Modal */}
      {isCreateOpen && (
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Commercial Quotation">
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Client Organization:</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.segment})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Product Line:</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-xs"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatCurrency(p.basePrice)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity:</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Discount %:</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={disc}
                  onChange={(e) => setDisc(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-[#5E2A52] hover:bg-[#4B2141]">
                Initialize Proposal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
