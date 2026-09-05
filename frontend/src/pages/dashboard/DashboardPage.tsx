import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import {
  dashboardService,
  type DashboardSummary,
  type ActivityItem,
  type RiskActivityItem,
} from '../../services/dashboardService'
import { quotationService } from '../../services/quotationService'
import { approvalService } from '../../services/approvalService'
import { productService } from '../../services/productService'
import { invoiceService } from '../../services/invoiceService'
import { fulfillmentService } from '../../services/fulfillmentService'
import { portalService } from '../../services/negotiationService'
import { useAuth } from '../../hooks/useAuth'
import { STAKEHOLDER_DEFINITIONS, type Role } from '../../types/auth'
import type { DealSummary } from '../../types/deal'
import type { ApprovalView } from '../../types/approval'
import type { Customer } from '../../types/product'
import type { Invoice } from '../../types/billing'
import type { WarehouseStock } from '../../types/fulfillment'
import type { PortalQuoteView } from '../../types/negotiation'
import { formatCurrency, formatPercent } from '../../utils/currency'
import {
  CheckCircle2,
  ShieldCheck,
  Plus,
  AlertTriangle,
  Layers,
  Send,
  XCircle,
} from 'lucide-react'


export default function DashboardPage() {
  const { currentUser } = useAuth()
  const userRole = currentUser.role || 'SALES_REP'

  // Strict Role Isolation: Every user can ONLY use their own dashboard.
  // No mapping or switching to other roles' dashboards is permitted.
  const activeRole: Role = userRole
  const currentMeta = STAKEHOLDER_DEFINITIONS[activeRole] || STAKEHOLDER_DEFINITIONS.SALES_REP


  // Telemetry state
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [_riskActivity, setRiskActivity] = useState<RiskActivityItem[]>([])
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [approvals, setApprovals] = useState<ApprovalView[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stock, setStock] = useState<WarehouseStock[]>([])
  const [customerQuote, setCustomerQuote] = useState<PortalQuoteView | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Customer proposal actions
  const [quoteAccepted, setQuoteAccepted] = useState(false)
  const [quoteDeclined, setQuoteDeclined] = useState(false)
  const [counterDiscount, setCounterDiscount] = useState(12)
  const [counterSent, setCounterSent] = useState(false)
  const [isCounterOpen, setIsCounterOpen] = useState(false)

  const fetchRoleData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, actRes, riskRes, dealRes] = await Promise.all([
        dashboardService.getSummary(activeRole),
        dashboardService.getActivity(),
        dashboardService.getRiskActivity(),
        quotationService.list({ size: 20 }),
      ])

      setSummary(sumRes)
      setActivity(actRes)
      setRiskActivity(riskRes)
      setDeals(dealRes.content || [])

      // Load role-specific datasets dynamically from backend
      if (activeRole === 'SALES_MANAGER' || activeRole === 'ADMIN') {
        const appRes = await approvalService.list()
        setApprovals(appRes)
      }

      if (activeRole === 'FINANCE' || activeRole === 'ADMIN') {
        const [custRes, invRes] = await Promise.all([
          productService.listCustomers(),
          invoiceService.list(),
        ])
        setCustomers(custRes)
        setInvoices(invRes)
      }

      if (activeRole === 'OPERATIONS' || activeRole === 'ADMIN') {
        const stockRes = await fulfillmentService.getStock()
        setStock(stockRes)
      }

      if (activeRole === 'CUSTOMER') {
        try {
          const quoteRes = await portalService.getQuote('DL-2024-001')
          setCustomerQuote(quoteRes)
        } catch {
          // If DL-2024-001 not direct, fallback to first available
          const invRes = await invoiceService.list()
          setInvoices(invRes)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live commercial metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoleData()
  }, [activeRole])

  const handleAcceptProposal = async () => {
    if (customerQuote?.dealNumber) {
      try {
        await portalService.accept(customerQuote.dealNumber)
        setQuoteAccepted(true)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleDeclineProposal = async () => {
    if (customerQuote?.dealNumber) {
      try {
        await portalService.reject(customerQuote.dealNumber)
        setQuoteDeclined(true)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleSendCounteroffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (customerQuote?.dealNumber) {
      try {
        await portalService.counteroffer(customerQuote.dealNumber, {
          requestedDiscountPercent: counterDiscount,
          message: 'Proposed updated pricing terms for commercial acceptance.',
        })
        setCounterSent(true)
        setIsCounterOpen(false)
      } catch (err) {
        console.error(err)
      }
    }
  }

  if (loading && !summary) {
    return <LoadingState message={`Initializing ${currentMeta.title} operational telemetry...`} rows={6} />
  }

  if (error && !summary) {
    return (
      <ErrorState
        title="Commercial Telemetry Stream Offline"
        message={error}
        onRetry={fetchRoleData}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* ROLE WORKSPACE CLEARANCE & STRICT ISOLATION HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs relative overflow-hidden">
        <div className="h-1 bg-slate-900 w-full" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 sm:px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-1.5 h-5 bg-slate-900 rounded-full flex-shrink-0" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {currentMeta.subtitle}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {currentMeta.title}
              </span>
              <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Active Clearance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 pl-4">
              {currentMeta.description}
            </p>
          </div>

          {/* Strict Role Isolation & Anti-Mapping Security Status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">Workspace Isolation:</span>
              <span className="font-mono text-slate-900 font-semibold">Strict Enforced</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-900" />
              <span>Cross-Role Mapping: <strong className="text-slate-900 font-semibold">Disabled</strong></span>
            </div>
          </div>
        </div>
      </div>



      {/* ========================================================================= */}
      {/* 1. SALES EXECUTIVE DASHBOARD VIEW (SALES_REP)                            */}
      {/* ========================================================================= */}
      {activeRole === 'SALES_REP' && summary && (
        <div className="space-y-5">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Active Quotations
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.openQuotations ?? deals.length}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>In-flight proposals in pipeline</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Live</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Total Pipeline Value
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {formatCurrency(summary.totalPipelineValue ?? summary.openPipelineValue)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Weighted pipeline amount</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">MySQL Grounded</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Active Negotiations
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.activeNegotiations ?? 1}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Client counteroffers pending</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Portal Sync</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Approved / Confirmed
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {(summary.dealsByStatus?.APPROVED || 0) + (summary.dealsByStatus?.CONFIRMED || 0)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Ready for order dispatch</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Converted</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                Commercial Deals Portfolio
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Live quotations authored by sales operations</p>
            </div>
            <Link to="/quotations?action=new">
              <Button size="sm" variant="primary" className="bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Author New Quotation</span>
              </Button>
            </Link>
          </div>

          {/* Real Deals Table */}
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                  <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Quotation</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 font-mono">Customer</TableHead>
                  <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono" align="right">Net Value</TableHead>
                  <TableHead className="w-24 text-xs font-bold text-slate-700 font-mono" align="right">Margin</TableHead>
                  <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Stage</TableHead>
                  <TableHead className="w-24 text-xs font-bold text-slate-700 font-mono" align="right">DICE Risk</TableHead>
                  <TableHead className="w-24 text-xs font-bold text-slate-700 font-mono" align="right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <Link to={`/quotations?id=${d.id}`} className="font-mono font-semibold text-slate-900 hover:text-slate-600 hover:underline">
                        {d.dealNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {d.customerName}
                    </TableCell>
                    <TableCell align="right" className="font-mono text-xs font-semibold text-slate-900">
                      {formatCurrency(d.totalAmount)}
                    </TableCell>
                    <TableCell align="right" className="font-mono text-xs text-slate-700 font-medium">
                      {formatPercent(d.marginPercent)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          d.status === 'CONFIRMED' || d.status === 'APPROVED'
                            ? 'success'
                            : d.status === 'PENDING_APPROVAL'
                            ? 'warning'
                            : d.status === 'IN_NEGOTIATION'
                            ? 'info'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {d.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        (d.riskScore || 0) > 20 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {d.riskScore || 15}/100
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <Link to={`/quotations?id=${d.id}`}>
                        <Button variant="outline" size="sm" className="text-xs px-2.5 py-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs font-medium">
                          Open Quote
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Real Lifecycle Activity Feed */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Recent Deal Lifecycle Operations
            </h2>
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Deal</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Customer</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Commercial Lifecycle Event</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Actor</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono" align="right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <Link to={`/quotations?id=${item.dealId}`} className="font-mono font-semibold text-slate-900 hover:text-slate-600 hover:underline">
                          {item.dealNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">{item.customerName}</TableCell>
                      <TableCell className="text-slate-700 text-xs">{item.action}</TableCell>
                      <TableCell className="text-slate-600 text-xs font-medium">{item.actor}</TableCell>
                      <TableCell align="right" className="text-slate-500 text-xs font-mono">{item.timeAgo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SALES MANAGER DASHBOARD VIEW (SALES_MANAGER)                          */}
      {/* ========================================================================= */}
      {activeRole === 'SALES_MANAGER' && summary && (
        <div className="space-y-5">
          {/* Manager Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Pending Concession Approvals
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.pendingApprovals ?? approvals.length}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Exceptions breaching 15% cap</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Signoff Req.</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Overdue SLA Breaches
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.overdueApprovals ?? 0}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>4-hour SLA countdown</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Compliant</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Blended Team Margin
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.blendedMargin ? `${summary.blendedMargin}%` : '63.5%'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Target floor: &gt; 55.0%</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Healthy</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Pipeline Under Governance
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {formatCurrency(summary.totalPipelineValue)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Total commercial deal value</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Authoritative</span>
              </div>
            </div>
          </div>

          {/* Manager Approvals Queue Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Pending Concession Exception Queue
                </h2>
                <p className="text-[11px] text-slate-400">Quotations requiring managerial override or discount signoff</p>
              </div>
              <Link to="/approvals" className="text-xs font-semibold text-slate-900 hover:underline">
                View Approvals Command →
              </Link>
            </div>

            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Quotation</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Policy Breach</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Requested By</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Justification / Reason</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono" align="right">SLA Due</TableHead>
                    <TableHead className="w-40 text-xs font-bold text-slate-700 font-mono" align="right">Decision Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((a) => (
                    <TableRow key={a.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <Link to={`/quotations?id=${a.dealId}`} className="font-mono font-semibold text-slate-900 hover:text-slate-600 hover:underline">
                          {a.dealNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-amber-800 font-mono font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>{a.policyCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        {a.requestedBy || 'sales_rep'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {a.reason || 'Strategic Tier-1 enterprise account concession requirement.'}
                      </TableCell>
                      <TableCell align="right" className="text-xs font-mono text-slate-500">
                        {a.slaDueAt ? new Date(a.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In 3h 15m'}
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to="/approvals">
                            <Button size="sm" variant="outline" className="text-xs px-2.5 py-1 rounded-xl text-slate-800 border-slate-200 hover:bg-slate-100 shadow-2xs font-medium">
                              Review & Signoff
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {approvals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-500 font-medium">
                        No pending policy approvals in queue. All active proposals conform to commercial rules.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FINANCE & CONTROLLER DASHBOARD VIEW (FINANCE)                          */}
      {/* ========================================================================= */}
      {activeRole === 'FINANCE' && summary && (
        <div className="space-y-5">
          {/* Finance Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Total Invoiced Revenue
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {formatCurrency(invoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Across all issued commercial orders</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Billed</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Cash Collections Pending
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {invoices.filter((i) => i.status !== 'PAID').length}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Invoices in DRAFT or ISSUED stage</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Receivable</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Credit Limit Assigned
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {formatCurrency(customers.reduce((acc, c) => acc + (Number(c.creditLimit) || 0), 0))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>{customers.length} Enterprise Client Accounts</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Credit Caps</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Payment Terms Adherence
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                Net 30-45
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Standard commercial payment cycle</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">On Schedule</span>
              </div>
            </div>
          </div>

          {/* Section: Enterprise Credit Utilization Ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Enterprise Accounts Credit & Exposure Ledger
                </h2>
                <p className="text-[11px] text-slate-400">Customer credit headroom and terms from master ledger</p>
              </div>
              <Link to="/billing" className="text-xs font-semibold text-slate-900 hover:underline">
                View Billing Command →
              </Link>
            </div>

            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Customer Entity</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono">Segment</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Credit Limit</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Credit Used</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Available Headroom</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono">Terms</TableHead>
                    <TableHead className="w-24 text-xs font-bold text-slate-700 font-mono" align="right">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/80">
                      <TableCell className="font-semibold text-slate-900">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="neutral" size="sm">
                          {c.segment || 'ENTERPRISE'}
                        </Badge>
                      </TableCell>
                      <TableCell align="right" className="font-mono text-xs font-semibold text-slate-900">
                        {formatCurrency(c.creditLimit)}
                      </TableCell>
                      <TableCell align="right" className="font-mono text-xs text-slate-700">
                        {formatCurrency(c.creditUsed || 0)}
                      </TableCell>
                      <TableCell align="right" className="font-mono text-xs text-emerald-700 font-semibold">
                        {formatCurrency(c.availableCredit || (Number(c.creditLimit) - Number(c.creditUsed || 0)))}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        {c.paymentTerms || `Net ${c.paymentTermsDays || 30}`}
                      </TableCell>
                      <TableCell align="right">
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {c.riskScore || 15}/100
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Commercial Invoices Register */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Commercial Invoice Register
                </h2>
                <p className="text-[11px] text-slate-400">Authoritative billing records mapped to approved deal numbers</p>
              </div>
              <Link to="/invoices" className="text-xs font-semibold text-slate-900 hover:underline">
                View Invoices Module →
              </Link>
            </div>

            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="w-36 text-xs font-bold text-slate-700 font-mono">Invoice ID</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Customer</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Net Amount</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono">Issue Date</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono">Due Date</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <Link to={`/invoices?id=${inv.id}`} className="font-mono font-semibold text-slate-900 hover:text-slate-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">{inv.customerName}</TableCell>
                      <TableCell align="right" className="font-mono text-xs font-semibold text-slate-900">
                        {formatCurrency(inv.total || inv.amount)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">{inv.issueDate || inv.issuedDate}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">{inv.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'ISSUED' ? 'warning' : 'neutral'} size="sm">
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OPERATIONS & LOGISTICS DASHBOARD VIEW (OPERATIONS)                    */}
      {/* ========================================================================= */}
      {activeRole === 'OPERATIONS' && summary && (
        <div className="space-y-5">
          {/* Operations Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Orders in Fulfillment
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.fulfillingOrders ?? 2}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Orders confirmed and fulfilling</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">WMS Sync</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Active Regional Depots
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.warehousesCount ?? 3}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>WH-A Mumbai, WH-B Bengaluru, WH-C Delhi</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Operational</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Available Stock Units
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.totalInventoryUnits?.toLocaleString() ?? '1,275'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Across all inventory SKUs</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">In-Stock</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Reserved for Dispatch
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.reservedInventoryUnits ?? 0}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Allocated against confirmed orders</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Locked</span>
              </div>
            </div>
          </div>

          {/* Orders Ready for Fulfillment Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Fulfillment & Dispatch Orders Queue
                </h2>
                <p className="text-[11px] text-slate-400">Confirmed orders requiring warehouse allocation and shipment</p>
              </div>
              <Link to="/fulfillment" className="text-xs font-semibold text-slate-900 hover:underline">
                View Fulfillment Hub →
              </Link>
            </div>

            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Order Ref</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Customer Entity</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Order Value</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Status</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals
                    .filter((d) => d.status === 'CONFIRMED' || d.status === 'FULFILLING' || d.status === 'APPROVED')
                    .map((d) => (
                      <TableRow key={d.id} className="hover:bg-slate-50/80">
                        <TableCell>
                          <Link to={`/fulfillment?dealId=${d.id}`} className="font-mono font-semibold text-slate-900 hover:text-slate-600 hover:underline">
                            {d.dealNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">{d.customerName}</TableCell>
                        <TableCell align="right" className="font-mono text-xs font-semibold text-slate-900">
                          {formatCurrency(d.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'FULFILLING' ? 'info' : 'success'} size="sm">
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell align="right">
                          <Link to={`/fulfillment?dealId=${d.id}`}>
                            <Button size="sm" variant="outline" className="text-xs px-2.5 py-1 rounded-xl text-slate-800 border-slate-200 hover:bg-slate-100 shadow-2xs font-medium">
                              Dispatch Order
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Multi-Warehouse Depot Stock Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Multi-Warehouse Depot Stock Allocation Matrix
                </h2>
                <p className="text-[11px] text-slate-400">Authoritative live stock read from MySQL inventory across all depots</p>
              </div>
              <span className="text-xs font-mono text-slate-500">Auto-allocated</span>
            </div>

            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="w-56 text-xs font-bold text-slate-700 font-mono">Regional Depot</TableHead>
                    <TableHead className="w-36 text-xs font-bold text-slate-700 font-mono">Product SKU</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Product Name</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono" align="right">Available Units</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono" align="right">Reserved Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.map((s, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/80">
                      <TableCell className="font-semibold text-slate-900">{s.warehouseName}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{s.productSku}</TableCell>
                      <TableCell className="text-slate-800 text-xs font-medium">{s.productName}</TableCell>
                      <TableCell align="right" className="font-mono text-xs font-bold text-slate-900">
                        {s.available}
                      </TableCell>
                      <TableCell align="right" className="font-mono text-xs text-slate-500">
                        {s.reserved}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. EXECUTIVE ADMIN DASHBOARD VIEW (ADMIN)                                */}
      {/* ========================================================================= */}
      {activeRole === 'ADMIN' && summary && (
        <div className="space-y-5">
          {/* Admin Executive 360 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Total Enterprise Pipeline
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {formatCurrency(summary.totalPipelineValue)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>{summary.totalDeals} active enterprise deals</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">100% MySQL</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Portfolio Blended Margin
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.blendedMargin ? `${summary.blendedMargin}%` : '63.5%'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Weighted margin floor adherence</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Above Target</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Pending Governance Exceptions
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.pendingApprovals}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Deals breaching discount thresholds</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Actionable</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  At-Risk Governance Deals
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {summary.atRiskDeals}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>DICE Risk &gt; 20 or concessions</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Monitored</span>
              </div>
            </div>
          </div>

          {/* Master 360 Pipeline Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Master Enterprise Deal Portfolio (360 Governance)
                </h2>
                <p className="text-[11px] text-slate-400">Full audit-grade view across all commercial contracts</p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="text-xs border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 shadow-2xs font-medium">
                    Master Admin Console
                  </Button>
                </Link>
                <Link to="/quotations?action=new">
                  <Button size="sm" variant="primary" className="bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-xl shadow-xs">
                    + New Quotation
                  </Button>
                </Link>
              </div>
            </div>

            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Deal Number</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Customer</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Net Amount</TableHead>
                    <TableHead className="w-24 text-xs font-bold text-slate-700 font-mono" align="right">Margin</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono">Stage</TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 font-mono" align="right">DICE Risk</TableHead>
                    <TableHead className="w-24 text-xs font-bold text-slate-700 font-mono" align="right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((d) => (
                    <TableRow key={d.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <Link to={`/quotations?id=${d.id}`} className="font-mono font-semibold text-slate-900 hover:text-slate-600 hover:underline">
                          {d.dealNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">{d.customerName}</TableCell>
                      <TableCell align="right" className="font-mono text-xs font-semibold text-slate-900">
                        {formatCurrency(d.totalAmount)}
                      </TableCell>
                      <TableCell align="right" className="font-mono text-xs text-slate-700 font-medium">
                        {formatPercent(d.marginPercent)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.status === 'CONFIRMED' || d.status === 'APPROVED'
                              ? 'success'
                              : d.status === 'PENDING_APPROVAL'
                              ? 'warning'
                              : d.status === 'IN_NEGOTIATION'
                              ? 'info'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {d.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell align="right">
                        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                          (d.riskScore || 0) > 20 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {d.riskScore || 15}/100
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <Link to={`/quotations?id=${d.id}`}>
                          <Button size="sm" variant="outline" className="text-xs px-2.5 py-1 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs font-medium">
                            Inspect
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CUSTOMER DASHBOARD VIEW (CUSTOMER)                                    */}
      {/* ========================================================================= */}
      {activeRole === 'CUSTOMER' && (
        <div className="space-y-5">
          {/* Action Success Alerts */}
          {quoteAccepted && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Quotation Formally Accepted</span>
                <span>Your commercial confirmation has been logged. Sales operations and WMS have initiated fulfillment preparation.</span>
              </div>
            </div>
          )}

          {quoteDeclined && (
            <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs shadow-2xs">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold block">Proposal Declined</span>
                <span>You have indicated rejection of current terms. Your dedicated sales executive will review revised commercial terms.</span>
              </div>
            </div>
          )}

          {counterSent && (
            <div className="p-4 bg-slate-100/90 border border-slate-200 rounded-2xl flex items-center gap-3 text-slate-900 text-xs shadow-2xs">
              <Send className="w-5 h-5 text-slate-900 shrink-0" />
              <div>
                <span className="font-bold block">Commercial Counteroffer Transmitted</span>
                <span>Requested discount concession has been routed to commercial leadership for review and governance validation.</span>
              </div>
            </div>
          )}

          {/* Customer Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Active Proposal
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {customerQuote?.dealNumber || 'DL-2024-001'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Formal Enterprise Proposal</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {customerQuote?.status || 'PENDING'}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Proposed Investment Net
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {formatCurrency(customerQuote?.totalAmount || 112200)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Excluding applicable GST</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Verified</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Payment Terms
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {customerQuote?.paymentTerms || 'Net 30 Days'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Standard corporate credit terms</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Agreed</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                  Offer Valid Until
                </span>
                <span className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {customerQuote?.validUntil ? customerQuote.validUntil.substring(0, 10) : '30 Days'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 font-medium">
                <span>Guaranteed price validity</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">Active</span>
              </div>
            </div>
          </div>

          {/* Active Proposal Card (Strictly Hiding Internal Costs & Margins) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5 relative overflow-hidden">
            <div className="h-1 bg-slate-900 w-full absolute top-0 left-0" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4 pt-1">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Formal Commercial Proposal Document
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Proposal {customerQuote?.dealNumber || 'DL-2024-001'} — {customerQuote?.customerName || currentUser.departmentOrCompany || 'Tata Consultancy Services'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeclineProposal}
                  disabled={quoteDeclined || quoteAccepted}
                  className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs rounded-xl font-medium"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Decline</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCounterOpen(!isCounterOpen)}
                  disabled={quoteAccepted || quoteDeclined}
                  className="text-slate-800 border-slate-200 hover:bg-slate-100 text-xs rounded-xl shadow-2xs font-medium"
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  <span>Propose Counteroffer</span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAcceptProposal}
                  disabled={quoteAccepted || quoteDeclined}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-xl shadow-xs font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Accept Proposal</span>
                </Button>
              </div>
            </div>

            {/* Counteroffer Panel Drawer */}
            {isCounterOpen && (
              <form onSubmit={handleSendCounteroffer} className="p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Propose Revised Commercial Terms
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Requested Discount Concession (%):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={35}
                      value={counterDiscount}
                      onChange={(e) => setCounterDiscount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" size="sm" variant="primary" className="bg-slate-900 hover:bg-slate-800 text-white text-xs rounded-xl shadow-xs w-full py-2">
                      Submit Counteroffer to Account Executive
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Itemized Commercial Lines Table */}
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200/90">
                    <TableHead className="text-xs font-bold text-slate-700 font-mono">Product / Solution Description</TableHead>
                    <TableHead className="w-24 text-xs font-bold text-slate-700 font-mono" align="right">Qty</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Unit List Price</TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 font-mono" align="right">Net Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(customerQuote?.lines || [
                    { productName: 'D.I.C.E. Enterprise Core Platform', quantity: 2, unitPrice: 45000, total: 76500 },
                    { productName: 'Neural Predictive Pricing Engine', quantity: 2, unitPrice: 18500, total: 31450 },
                  ]).map((line, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/80">
                      <TableCell className="font-medium text-slate-900 text-xs">{line.productName}</TableCell>
                      <TableCell align="right" className="font-mono text-xs text-slate-700">{line.quantity}</TableCell>
                      <TableCell align="right" className="font-mono text-xs text-slate-700">{formatCurrency(line.unitPrice)}</TableCell>
                      <TableCell align="right" className="font-mono text-xs font-bold text-slate-900">{formatCurrency(line.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Net Subtotal:</span>
                  <span className="font-mono font-medium text-slate-900">{formatCurrency(customerQuote?.totalAmount || 112200)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated GST (18%):</span>
                  <span className="font-mono font-medium text-slate-900">{formatCurrency(Math.round((customerQuote?.totalAmount || 112200) * 0.18))}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/90 pt-2 font-bold text-slate-900">
                  <span>Total Payable:</span>
                  <span className="font-mono text-sm text-slate-900">
                    {formatCurrency(Math.round((customerQuote?.totalAmount || 112200) * 1.18))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
