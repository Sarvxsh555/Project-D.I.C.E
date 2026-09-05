import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { billingService } from '../../services/billingService'
import { formatCurrency } from '../../utils/currency'
import type { Subscription, BillingSchedule } from '../../types/billing'
import { FileText, Plus, CheckCircle2 } from 'lucide-react'

export default function BillingPage() {
  const { id: dealId } = useParams<{ id: string }>()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [schedule, setSchedule] = useState<BillingSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSuccess, setGeneratedSuccess] = useState(false)

  const loadData = async () => {
    if (!dealId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [subsRes, scheduleRes] = await Promise.all([
        billingService.listSubscriptionsForDeal(dealId),
        billingService.getSchedule(dealId),
      ])
      setSubscriptions(subsRes)
      setSchedule(scheduleRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId])

  const handleGenerateInvoice = async () => {
    if (!dealId) return
    setIsGenerating(true)
    try {
      await billingService.generateInvoice(dealId)
      setGeneratedSuccess(true)
      setTimeout(() => setGeneratedSuccess(false), 4000)
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!dealId) {
    return (
      <EmptyState
        title="Select a quotation"
        description="Billing schedules are per-deal. Open a quotation and choose Billing from there."
        action={
          <Link to="/quotations">
            <Button variant="primary" size="sm">Go to Quotations</Button>
          </Link>
        }
      />
    )
  }

  if (loading) {
    return <LoadingState message="Loading billing schedule..." rows={6} />
  }

  if (error || !schedule) {
    return <ErrorState title="Billing Ledger Offline" message={error || 'Could not load billing'} onRetry={loadData} />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Billing & Invoicing Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {schedule.installments.length > 1 ? 'Milestone billing schedule' : 'One-time billing schedule'} — payment terms Net-{schedule.paymentTermsDays}
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
            className="bg-[#5E2A52] hover:bg-[#4B2141] text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating...' : 'Generate Invoice'}</span>
          </Button>
        </div>
      </div>

      {generatedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Invoice generated successfully.</span>
        </div>
      )}

      {/* SECTION 1: SCHEDULE TOTALS — every value straight from BillingEngine.BillingSchedule */}
      <div className="border border-slate-200 bg-white rounded divide-y md:divide-y-0 md:divide-x divide-slate-200 grid grid-cols-2 sm:grid-cols-3 text-xs">
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Amount</span>
          <span className="font-mono font-bold text-slate-900 block mt-0.5 text-sm">{formatCurrency(schedule.totalAmount, schedule.currency)}</span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Payment Terms</span>
          <span className="text-slate-800 block mt-0.5">Net-{schedule.paymentTermsDays} Days</span>
        </div>
        <div className="p-3">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Installments</span>
          <span className="text-slate-800 block mt-0.5">{schedule.installments.length}</span>
        </div>
      </div>

      {/* SECTION 2: INSTALLMENT SCHEDULE */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Installment Schedule
        </h2>

        {schedule.installments.length === 0 ? (
          <EmptyState title="No installments" description="This deal's billing schedule has no installments yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="w-32">Due Date</TableHead>
                <TableHead className="w-32" align="right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.installments.map((inst) => (
                <TableRow key={inst.code}>
                  <TableCell className="font-mono text-slate-500">{inst.code}</TableCell>
                  <TableCell className="font-medium text-slate-900">{inst.label}</TableCell>
                  <TableCell className="font-mono text-slate-700">{inst.dueDate}</TableCell>
                  <TableCell align="right" className="font-bold text-slate-900">
                    {formatCurrency(inst.amount, schedule.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* SECTION 3: LINE ITEMS */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Line Items
        </h2>

        {schedule.lineItems.length === 0 ? (
          <EmptyState title="No line items" description="This deal has no billable lines yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20" align="right">Qty</TableHead>
                <TableHead className="w-28" align="right">Unit Price</TableHead>
                <TableHead className="w-28" align="right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.lineItems.map((line) => (
                <TableRow key={line.sku}>
                  <TableCell className="font-mono text-slate-500">{line.sku}</TableCell>
                  <TableCell className="text-slate-700">{line.description}</TableCell>
                  <TableCell align="right">{line.quantity}</TableCell>
                  <TableCell align="right" className="font-mono">{formatCurrency(line.unitPrice, schedule.currency)}</TableCell>
                  <TableCell align="right" className="font-mono font-semibold">{formatCurrency(line.amount, schedule.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* SECTION 4: SUBSCRIPTIONS FOR THIS DEAL */}
      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Recurring Subscriptions
        </h2>

        {subscriptions.length === 0 ? (
          <EmptyState title="No subscriptions" description="This deal has no recurring subscription lines." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Subscription ID</TableHead>
                <TableHead className="w-32">Start Date</TableHead>
                <TableHead className="w-32">Next Renewal</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono font-semibold text-[#5E2A52]">
                    {sub.id}
                  </TableCell>
                  <TableCell className="font-mono text-slate-600 text-xs">
                    {sub.startDate}
                  </TableCell>
                  <TableCell className="font-mono text-slate-500 text-xs">
                    {sub.nextBillingDate}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                      {sub.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
