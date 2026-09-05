import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { invoiceService } from '../../services/invoiceService'
import { formatCurrency } from '../../utils/currency'
import type { Invoice } from '../../types/billing'
import { CheckCircle2, ArrowLeft, Ban, DollarSign } from 'lucide-react'

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const invoiceIdParam = searchParams.get('id')

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detail State
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await invoiceService.list(statusFilter === 'ALL' ? undefined : statusFilter)
      setInvoices(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [statusFilter])

  useEffect(() => {
    if (!invoiceIdParam) {
      setActiveInvoice(null)
      return
    }

    let active = true
    async function loadDetail() {
      setDetailLoading(true)
      try {
        const inv = await invoiceService.get(invoiceIdParam!)
        if (active) setActiveInvoice(inv)
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    loadDetail()
    return () => {
      active = false
    }
  }, [invoiceIdParam])

  const handleIssue = async () => {
    if (!activeInvoice) return
    const updated = await invoiceService.issue(activeInvoice.id)
    setActiveInvoice(updated)
    loadInvoices()
  }

  const handleMarkPaid = async () => {
    if (!activeInvoice) return
    const updated = await invoiceService.markPaid(activeInvoice.id)
    setActiveInvoice(updated)
    loadInvoices()
  }

  const handleCancel = async () => {
    if (!activeInvoice) return
    const updated = await invoiceService.cancel(activeInvoice.id)
    setActiveInvoice(updated)
    loadInvoices()
  }

  // ==========================================
  // RENDER: INVOICE DETAIL
  // ==========================================
  if (invoiceIdParam) {
    if (detailLoading || !activeInvoice) {
      return <LoadingState message="Loading invoice statement..." rows={5} />
    }

    const steps = ['DRAFT', 'ISSUED', 'PAID']
    const isOverdue = activeInvoice.status === 'OVERDUE'

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchParams({})}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Button>

        {/* Invoice Statement Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                  Tax Invoice
                </span>
                <Badge
                  variant={
                    activeInvoice.status === 'PAID'
                      ? 'success'
                      : activeInvoice.status === 'OVERDUE'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {activeInvoice.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                {activeInvoice.invoiceNumber}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: <strong className="text-slate-800">{activeInvoice.customerName}</strong> • Deal: <strong className="font-mono text-[#5E2A52]">{activeInvoice.dealNumber}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeInvoice.status === 'DRAFT' && (
                <Button variant="primary" size="sm" onClick={handleIssue} className="bg-[#5E2A52] hover:bg-[#4d2243]">
                  Issue Invoice
                </Button>
              )}
              {activeInvoice.status === 'ISSUED' && (
                <Button variant="primary" size="sm" onClick={handleMarkPaid} className="bg-emerald-700 hover:bg-emerald-800">
                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                  Mark as Paid
                </Button>
              )}
              {activeInvoice.status !== 'PAID' && activeInvoice.status !== 'CANCELLED' && (
                <Button variant="outline" size="sm" onClick={handleCancel} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  Cancel Invoice
                </Button>
              )}
            </div>
          </div>

          {/* Lifecycle Stepper */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-3">
              Invoice Payment Progression
            </h4>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
              {(isOverdue ? ['DRAFT', 'ISSUED', 'OVERDUE'] : steps).map((s, idx) => {
                const isCurrent = activeInvoice.status === s
                const isDone = (activeInvoice.status === 'PAID' && idx < 2) || (s === 'DRAFT')

                return (
                  <div key={s} className="relative z-10 flex flex-col items-center bg-slate-50 px-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? s === 'OVERDUE'
                            ? 'bg-rose-600 text-white'
                            : 'bg-[#5E2A52] text-white'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className="text-[11px] font-semibold mt-1 text-slate-700">{s}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Invoice Financial Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                Billed Amount
              </span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {formatCurrency(activeInvoice.amount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                Issue Date
              </span>
              <span className="text-sm font-semibold text-slate-800 font-mono">
                {activeInvoice.issueDate || activeInvoice.issuedDate}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                Due Date
              </span>
              <span className="text-sm font-semibold text-slate-800 font-mono">
                {activeInvoice.dueDate}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                Settled Date
              </span>
              <span className="text-sm font-semibold text-slate-800 font-mono">
                {activeInvoice.paidDate || 'Pending Settlement'}
              </span>
            </div>
          </div>

          {/* Line Items */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {activeInvoice.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-3 px-3 text-slate-900">{l.description}</td>
                    <td className="py-3 px-3 text-right">{l.quantity}</td>
                    <td className="py-3 px-3 text-right text-slate-600 font-mono">
                      {formatCurrency(l.unitPrice)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(l.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER: INVOICE LIST
  // ==========================================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invoices & Revenue Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track billed milestones, customer receivables, and payment reconciliation
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {['ALL', 'PAID', 'ISSUED', 'DRAFT'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === filter
                  ? 'bg-white shadow-xs text-[#5E2A52] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'ALL' ? 'All Invoices' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading invoice records..." rows={4} />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={loadInvoices} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-3">Issue Date</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#5E2A52]">
                    <button
                      onClick={() => setSearchParams({ id: inv.id })}
                      className="hover:underline cursor-pointer text-left"
                    >
                      {inv.invoiceNumber}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div>{inv.customerName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{inv.dealNumber}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold font-mono text-slate-900">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-500">
                    {inv.issueDate || inv.issuedDate}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-900 font-medium">
                    {inv.dueDate}
                  </td>
                  <td className="py-3.5 px-3">
                    <Badge
                      variant={
                        inv.status === 'PAID'
                          ? 'success'
                          : inv.status === 'OVERDUE'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchParams({ id: inv.id })}
                    >
                      View Invoice
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
