import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Tabs } from '../../components/ui/Tabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import {
  DealHeader,
  DealLineTable,
  PricingSummary,
  DiceDecisionBlock,
  DiceSimulationDrawer,
  ApprovalSnapshotView,
  WarehouseAllocationView,
  HybridBillingView,
  AuditTimeline,
} from '../../components/domain'
import { quotationService } from '../../services/quotationService'
import { approvalService } from '../../services/approvalService'
import { fulfillmentService } from '../../services/fulfillmentService'
import { billingService } from '../../services/billingService'
import { auditService } from '../../services/auditService'
import { productService } from '../../services/productService'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { DealSummary, DealDetail, DealStatus } from '../../types/deal'
import type { DiceDecision } from '../../types/dice'
import type { ApprovalView } from '../../types/approval'
import type { FulfillmentPlan, WarehouseStock } from '../../types/fulfillment'
import type { HybridBillingDetail } from '../../types/billing'
import type { AuditEvent } from '../../types/audit'
import type { Product, Customer } from '../../types/product'
import {
  Table as TableIcon,
  Columns,
  Plus,
  Search,
  ArrowLeft,
  ExternalLink,
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Deal Workspace State
  const [activeDeal, setActiveDeal] = useState<DealDetail | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [diceDecision, setDiceDecision] = useState<DiceDecision | null>(null)
  const [approval, setApproval] = useState<ApprovalView | null>(null)
  const [fulfillment, setFulfillment] = useState<FulfillmentPlan | null>(null)
  const [stock, setStock] = useState<WarehouseStock[]>([])
  const [billing, setBilling] = useState<HybridBillingDetail | null>(null)
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
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

    let active = true
    async function loadWorkspace() {
      setWorkspaceLoading(true)
      try {
        const [dealRes, decRes, appRes, fulRes, stRes, billRes, audRes] = await Promise.all([
          quotationService.get(dealParam!),
          quotationService.getDecision(dealParam!),
          approvalService.get(dealParam!),
          fulfillmentService.get(dealParam!),
          fulfillmentService.getStock(),
          billingService.get(dealParam!),
          auditService.getEvents('DEAL', dealParam!),
        ])

        if (active) {
          setActiveDeal(dealRes)
          setDiceDecision(decRes)
          setApproval(appRes)
          setFulfillment(fulRes)
          setStock(stRes)
          setBilling(billRes)
          setAuditEvents(audRes)
        }
      } catch (err) {
        console.error('Error loading deal workspace:', err)
      } finally {
        if (active) setWorkspaceLoading(false)
      }
    }

    loadWorkspace()
    return () => {
      active = false
    }
  }, [dealParam])

  // Open Create Modal if ?action=new
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
      return matchesSearch
    })
  }, [deals, searchQuery])

  // KANBAN GROUPING
  const kanbanColumns = [
    { id: 'DRAFT', title: 'Draft' },
    { id: 'SUBMITTED', title: 'Submitted' },
    { id: 'APPROVAL_REQUIRED', title: 'Approval Required' },
    { id: 'APPROVED', title: 'Approved' },
    { id: 'REJECTED', title: 'Rejected' },
  ]

  // ==========================================
  // RENDER: DEAL WORKSPACE (Quotation Detail)
  // ==========================================
  if (dealParam) {
    if (workspaceLoading || !activeDeal) {
      return <LoadingState message={`Loading Quotation ${dealParam} Workspace...`} rows={6} />
    }

    const tabsList = [
      { id: 'overview', label: 'Quotation Overview' },
      { id: 'dice', label: 'DICE Intelligence' },
      { id: 'approval', label: 'Governance Approval' },
      { id: 'fulfillment', label: 'WMS Fulfillment' },
      { id: 'billing', label: 'Hybrid Billing' },
      { id: 'audit', label: 'Audit Trail' },
    ]

    return (
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quotations List
          </Button>

          {/* Quick link to Customer Portal */}
          <Link
            to={`/portal/quotes/${activeDeal.portalToken || 'portal-token-q1042-acme'}`}
            target="_blank"
            className="text-xs font-semibold text-[#5E2A52] flex items-center gap-1 hover:underline"
          >
            <span>Customer Portal View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Central Deal Header */}
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

        {/* Tabbed Workspace Content */}
        <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} />

        <div className="pt-2">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Highlight DICE Decision Banner at the top of overview */}
              {diceDecision && (
                <DiceDecisionBlock
                  decision={diceDecision}
                  onSimulate={() => setIsSimOpen(true)}
                />
              )}

              {/* Product Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700">
                    Product & Service Quotation Lines
                  </h3>
                  <span className="text-xs text-slate-400">
                    {activeDeal.lines.length} Line Items
                  </span>
                </div>
                <DealLineTable lines={activeDeal.lines} />
              </div>

              {/* Grid: Pricing Summary + Customer Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3">
                    Contractual Notes & Governance Directives
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeDeal.notes ||
                      'Standard commercial terms applicable. Multi-depot fulfillment authorized subject to manager approval of services discount ceiling.'}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-[11px] text-slate-500">
                    <span>Account Credit Limit: <strong>₹10,00,000</strong></span>
                    <span>•</span>
                    <span>Credit Utilization: <strong>43.4%</strong></span>
                    <span>•</span>
                    <span>Tax Regime: <strong>GST Dual Interstate</strong></span>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <PricingSummary deal={activeDeal} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DICE DECISION */}
          {activeTab === 'dice' && (
            <div className="space-y-6">
              {diceDecision ? (
                <DiceDecisionBlock
                  decision={diceDecision}
                  onSimulate={() => setIsSimOpen(true)}
                />
              ) : (
                <EmptyState
                  title="DICE Engine Evaluation Pending"
                  description="Submit quotation lines to trigger multi-factor margin and risk scoring."
                />
              )}
            </div>
          )}

          {/* TAB 3: APPROVAL */}
          {activeTab === 'approval' && (
            <div className="space-y-6">
              {approval?.snapshot ? (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3">
                    Authorized Approval Snapshot
                  </h3>
                  <ApprovalSnapshotView snapshot={approval.snapshot} />
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700 block">
                        Approval Request Pending
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        Required Role: {approval?.requiredRole || 'SALES_MANAGER'}
                      </h3>
                    </div>
                    <Badge variant="warning">Awaiting Sign-off</Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    {approval?.reason || 'Service line item discount exceeds default tier ceiling.'}
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Requested by: Vikram Sharma</span>
                    <span>SLA Target: 8 Hours</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FULFILLMENT */}
          {activeTab === 'fulfillment' && (
            <div className="space-y-6">
              {fulfillment ? (
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
              ) : (
                <EmptyState
                  title="Fulfillment Order Not Created"
                  description="Fulfillment allocations are generated once the deal is approved."
                />
              )}
            </div>
          )}

          {/* TAB 5: BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {billing ? (
                <HybridBillingView
                  billing={billing}
                  onGenerateInvoice={async () => {
                    await billingService.generateInvoice(activeDeal.id)
                    alert('Milestone Invoice generated successfully! View in Invoices tab.')
                  }}
                />
              ) : (
                <EmptyState
                  title="No Billing Schedule"
                  description="Hybrid billing schedules are attached upon quote confirmation."
                />
              )}
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <AuditTimeline events={auditEvents} />
            </div>
          )}
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
  // RENDER: QUOTATIONS LIST (Table & Kanban)
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quotations & Deals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage enterprise sales pipeline, review margins, and evaluate DICE governance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-xs text-[#5E2A52] font-semibold' : 'text-slate-600'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'kanban' ? 'bg-white shadow-xs text-[#5E2A52] font-semibold' : 'text-slate-600'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Quotation
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotation ID or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 hidden sm:inline">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-white text-slate-700 focus:ring-1 focus:ring-[#5E2A52]"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVAL_REQUIRED">Approval Required</option>
            <option value="APPROVED">Approved</option>
            <option value="NEGOTIATION">In Negotiation</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading quotation pipeline..." rows={5} />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={loadDeals} />
      ) : filteredDeals.length === 0 ? (
        <EmptyState
          title="No Quotations Found"
          description="Try adjusting your search criteria or create a new quotation."
        />
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Quotation</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Total Deal</th>
                <th className="py-3 px-3 text-right">Margin</th>
                <th className="py-3 px-3 text-right">DICE Risk</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeals.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#5E2A52]">
                    <button
                      onClick={() => setSearchParams({ id: d.id })}
                      className="hover:underline text-left cursor-pointer"
                    >
                      {d.dealNumber}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {d.customerName}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(d.totalAmount)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                        d.marginPercent >= 20
                          ? 'text-emerald-700'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {formatPercent(d.marginPercent)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] ${
                        d.riskScore >= 70
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'text-slate-600'
                      }`}
                    >
                      {d.riskScore}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        d.status === 'APPROVED' || d.status === 'CONFIRMED'
                          ? 'success'
                          : d.status === 'APPROVAL_REQUIRED' || d.status === 'NEGOTIATION'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {d.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{d.owner}</td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchParams({ id: d.id })}
                    >
                      Open Workspace
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colDeals = filteredDeals.filter((d) => {
              if (col.id === 'APPROVAL_REQUIRED') {
                return d.status === 'APPROVAL_REQUIRED' || d.status === 'PENDING_APPROVAL'
              }
              return d.status === col.id
            })

            return (
              <div
                key={col.id}
                className="bg-slate-100/60 border border-slate-200 rounded-lg p-3 min-h-[400px]"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <span>{col.title}</span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                    {colDeals.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {colDeals.map((deal) => (
                    <div
                      key={deal.id}
                      onClick={() => setSearchParams({ id: deal.id })}
                      className="bg-white border border-slate-200 rounded-md p-3 shadow-xs hover:border-[#5E2A52]/50 cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#5E2A52]">
                          {deal.dealNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Risk: {deal.riskScore}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-900">
                        {deal.customerName}
                      </div>
                      <div className="text-sm font-bold text-slate-800 font-mono">
                        {formatCurrency(deal.totalAmount)}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-500">Margin: {formatPercent(deal.marginPercent)}</span>
                        <Badge
                          variant={
                            deal.status === 'APPROVED' ? 'success' : 'warning'
                          }
                        >
                          {deal.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Quotation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Quotation"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Customer:
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#5E2A52]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.segment})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Product Line:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#5E2A52]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {formatCurrency(p.basePrice)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantity:
              </label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Proposed Discount %:
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={disc}
                onChange={(e) => setDisc(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-[#5E2A52] hover:bg-[#4d2243]"
            >
              Create Quotation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
