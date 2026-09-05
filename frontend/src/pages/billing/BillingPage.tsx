import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { billingService } from '../../services/billingService'
import { formatCurrency } from '../../utils/currency'
import type { Subscription, HybridBillingDetail } from '../../types/billing'
import { FileText, Plus, CheckCircle2 } from 'lucide-react'

export default function BillingPage() {
  const [searchParams] = useSearchParams()
  const dealId = searchParams.get('id') || 'd1'

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [hybridBilling, setHybridBilling] = useState<HybridBillingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSuccess, setGeneratedSuccess] = useState(false)
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [subsRes, billingRes] = await Promise.all([
        billingService.listSubscriptions(),
        billingService.get(dealId),
      ])
      setSubscriptions(subsRes)
      setHybridBilling(billingRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dealId])

  const handleGenerateInvoice = async () => {
    if (!hybridBilling) return
    setIsGenerating(true)
    try {
      const inv = await billingService.generateInvoice(hybridBilling.dealId)
      setLastInvoiceNumber(inv?.invoiceNumber || 'INV-NEW')
      setGeneratedSuccess(true)
      setTimeout(() => setGeneratedSuccess(false), 5000)
      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return <LoadingState message="Loading enterprise billing schedule and revenue ledger..." rows={6} />
  }

  if (error || !hybridBilling) {
    return <ErrorState title="Billing Ledger Offline" message={error || 'Could not load billing'} onRetry={loadData} />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Billing & Invoicing Schedules
            </h1>
            <Badge variant="info" size="sm">
              {hybridBilling.dealNumber} — {hybridBilling.customerName}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hybrid commercial revenue schedule, upfront milestones, and recurring subscription accounting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/invoices">
            <Button variant="outline" size="sm" className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices Ledger</span>
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            disabled={isGenerating}
            onClick={handleGenerateInvoice}
            className="bg-slate-900 hover:bg-slate-800 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating...' : 'Release Next Milestone Invoice'}</span>
          </Button>
        </div>
      </div>

      {generatedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Milestone invoice dispatched successfully for <strong>{hybridBilling.dealNumber}</strong>! Ref: <strong>{lastInvoiceNumber || 'INV-NEW'}</strong>.</span>
        </div>
      )}

      {/* SECTION 1: FINANCIAL REVENUE SPECIFICATION */}
      <div className="border border-slate-200 bg-white rounded divide-y md:divide-y-0 md:divide-x divide-slate-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 text-xs">
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Customer</span>
          <strong className="text-slate-900 block mt-0.5 truncate">{hybridBilling.customerName}</strong>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Quotation</span>
          <strong className="text-blue-600 font-mono block mt-0.5">{hybridBilling.dealNumber}</strong>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Billing Type</span>
          <span className="text-slate-800 block mt-0.5">Hybrid Milestone</span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">One-Time Amount</span>
          <span className="font-mono text-slate-900 block mt-0.5">{formatCurrency(hybridBilling.oneTimeTotal || 217000)}</span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Recurring (MRR)</span>
          <span className="font-mono text-slate-900 block mt-0.5">{formatCurrency(hybridBilling.recurringMonthlyTotal || 18000)}/mo</span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tax (18% GST)</span>
          <span className="font-mono text-slate-600 block mt-0.5">{formatCurrency(hybridBilling.taxAmount || 66203)}</span>
        </div>
        <div className="p-3 bg-slate-50/60">
          <span className="text-[10px] uppercase font-semibold text-slate-900 block">Total Contract</span>
          <span className="font-mono font-bold text-slate-900 block mt-0.5 text-sm">{formatCurrency(hybridBilling.netTotal || 434000)}</span>
        </div>
      </div>

      {/* SECTION 2: BILLING SCHEDULE TABLE (REAL TABLE) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Milestone Billing Schedule & Payment Triggers
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Terms: Net-30 Days
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Milestone / Contractual Term</TableHead>
              <TableHead>Trigger Condition</TableHead>
              <TableHead className="w-28">Due Date</TableHead>
              <TableHead className="w-32" align="right">Base Amount</TableHead>
              <TableHead className="w-28" align="right">Tax (18%)</TableHead>
              <TableHead className="w-32" align="right">Net Total</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28 font-mono">Invoice Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hybridBilling.timeline && hybridBilling.timeline.length > 0 ? (
              hybridBilling.timeline.map((item, idx) => {
                const baseAmount = Math.round(item.amount / 1.18)
                const taxAmount = item.amount - baseAmount
                return (
                  <TableRow key={item.id || idx}>
                    <TableCell className="font-mono text-slate-400">
                      {String(idx + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {item.chargeType === 'ONE_TIME' ? `Milestone delivery signoff for ${hybridBilling.dealNumber}` : 'Monthly recurring service billing cycle'}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {item.date || 'Immediate'}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(baseAmount)}</TableCell>
                    <TableCell align="right" className="text-slate-500">{formatCurrency(taxAmount)}</TableCell>
                    <TableCell align="right" className="font-bold text-slate-900">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'PAID' ? 'success' : item.status === 'INVOICED' ? 'warning' : 'neutral'} size="sm">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-slate-900">
                      {item.status === 'PAID' ? (
                        <Link to="/invoices" className="hover:underline">INV-PAID</Link>
                      ) : item.status === 'INVOICED' ? (
                        <Link to="/invoices" className="hover:underline">INV-ISSUED</Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-xs text-slate-500 py-6">
                  No billing milestones scheduled for this quotation.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* SECTION 3: RECURRING SUBSCRIPTIONS LEDGER (REAL TABLE) */}
      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Active Subscription Contracts
        </h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Subscription ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product / Service Tier</TableHead>
              <TableHead className="w-32" align="right">Monthly Rate</TableHead>
              <TableHead className="w-28">Billing Cycle</TableHead>
              <TableHead className="w-32">Next Renewal</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-mono font-semibold text-slate-900">
                  {sub.id}
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {sub.customerName}
                </TableCell>
                <TableCell className="text-slate-700">
                  {sub.planName || 'Enterprise Core Platform'}
                </TableCell>
                <TableCell align="right" className="font-mono font-bold text-slate-900">
                  {formatCurrency(sub.amount || 18000)}
                </TableCell>
                <TableCell className="text-slate-600 capitalize">
                  {sub.billingInterval || 'Monthly'}
                </TableCell>
                <TableCell className="font-mono text-slate-500 text-xs">
                  {sub.nextBillingDate || '2026-04-01'}
                </TableCell>
                <TableCell>
                  <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                    {sub.status || 'Active'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
