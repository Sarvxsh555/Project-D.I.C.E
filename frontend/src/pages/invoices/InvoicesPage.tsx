import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { invoiceService } from '../../services/invoiceService'
import { formatCurrency } from '../../utils/currency'
import type { Invoice, InvoiceStatus } from '../../types/billing'
import { ArrowLeft, DollarSign, Printer } from 'lucide-react'

const STATUS_FILTERS: Array<InvoiceStatus | 'ALL'> = ['ALL', 'DRAFT', 'ISSUED', 'PAID', 'VOID']

function statusVariant(status: InvoiceStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'PAID') return 'success'
  if (status === 'ISSUED') return 'warning'
  return 'neutral'
}

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const invoiceIdParam = searchParams.get('id')

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detail state
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setActionError(null)
    try {
      const updated = await invoiceService.issue(activeInvoice.id)
      setActiveInvoice(updated)
      loadInvoices()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to issue invoice')
    }
  }

  /** There is no direct "mark paid" endpoint — an invoice's status only ever
   *  changes as a side effect of a real recorded payment (PaymentService).
   *  This records one for the invoice's remaining balance. */
  const handleRecordPayment = async () => {
    if (!activeInvoice) return
    const amountStr = window.prompt(
      `Record a payment for this invoice (total ${formatCurrency(activeInvoice.totalAmount, activeInvoice.currency)}). Amount:`,
      String(activeInvoice.totalAmount)
    )
    if (!amountStr) return
    const amount = Number(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Enter a valid positive amount')
      return
    }
    setActionError(null)
    try {
      await invoiceService.recordPayment(activeInvoice.id, amount, crypto.randomUUID())
      const updated = await invoiceService.get(activeInvoice.id)
      setActiveInvoice(updated)
      loadInvoices()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Payment failed')
    }
  }

  // ==========================================
  // RENDER: INVOICE DETAIL
  // ==========================================
  if (invoiceIdParam) {
    if (detailLoading || !activeInvoice) {
      return <LoadingState message="Loading invoice..." rows={6} />
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Invoices Ledger</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </Button>
        </div>

        {actionError && (
          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {actionError}
          </div>
        )}

        {/* Invoice Statement — every field below is a real Invoice column */}
        <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Invoice
                </span>
                <Badge variant={statusVariant(activeInvoice.status)} size="sm">
                  {activeInvoice.status}
                </Badge>
              </div>
              <h1 className="text-lg font-bold font-mono text-slate-900 mt-1">
                {activeInvoice.id}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                <Link to={`/quotations?id=${activeInvoice.dealId}`} className="font-mono text-[#5E2A52] hover:underline">
                  View deal {activeInvoice.dealId}
                </Link>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeInvoice.status === 'DRAFT' && (
                <Button variant="primary" size="sm" onClick={handleIssue} className="bg-[#5E2A52] hover:bg-[#4B2141] text-xs">
                  Issue Invoice
                </Button>
              )}
              {activeInvoice.status === 'ISSUED' && (
                <Button variant="primary" size="sm" onClick={handleRecordPayment} className="bg-emerald-700 hover:bg-emerald-800 text-xs flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Record Payment
                </Button>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 text-xs border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Issued</span>
              <span className="font-mono text-slate-900">{activeInvoice.issuedAt ? new Date(activeInvoice.issuedAt).toLocaleDateString() : '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Due Date</span>
              <span className="font-mono font-bold text-slate-900">{activeInvoice.dueDate || '—'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Paid</span>
              <span className="font-mono text-slate-900">{activeInvoice.paidAt ? new Date(activeInvoice.paidAt).toLocaleDateString() : '—'}</span>
            </div>
          </div>

          {/* Real line items */}
          {activeInvoice.lines.length === 0 ? (
            <EmptyState title="No line items" description="This invoice has no billed lines." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20" align="right">Qty</TableHead>
                  <TableHead className="w-28" align="right">Unit Price</TableHead>
                  <TableHead className="w-32" align="right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeInvoice.lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-slate-400">{line.sku || '—'}</TableCell>
                    <TableCell className="font-medium text-slate-900">{line.description}</TableCell>
                    <TableCell align="right">{line.quantity}</TableCell>
                    <TableCell align="right" className="font-mono">{formatCurrency(line.unitPrice, activeInvoice.currency)}</TableCell>
                    <TableCell align="right" className="font-bold text-slate-900 font-mono">
                      {formatCurrency(line.amount, activeInvoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end pt-2 text-xs">
            <div className="w-72 space-y-1.5 text-slate-700">
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Total:</span>
                <span className="font-mono text-base">{formatCurrency(activeInvoice.totalAmount, activeInvoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER: INVOICES LEDGER
  // ==========================================
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Invoices Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every invoice across every deal
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter === 'ALL' ? 'All Invoices' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading invoices..." rows={6} />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={loadInvoices} />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices" description="No invoices match this filter yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">Invoice ID</TableHead>
              <TableHead className="w-64">Deal</TableHead>
              <TableHead className="w-32" align="right">Amount</TableHead>
              <TableHead className="w-28">Due Date</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24" align="right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ id: inv.id })}
                    className="font-mono text-xs text-[#5E2A52] hover:underline cursor-pointer text-left"
                  >
                    {inv.id}
                  </button>
                </TableCell>
                <TableCell className="font-mono text-slate-600 text-xs">
                  {inv.dealId}
                </TableCell>
                <TableCell align="right" className="font-bold font-mono text-slate-900">
                  {formatCurrency(inv.totalAmount, inv.currency)}
                </TableCell>
                <TableCell className="font-mono text-slate-800 text-xs">
                  {inv.dueDate || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(inv.status)} size="sm">
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <button
                    type="button"
                    onClick={() => setSearchParams({ id: inv.id })}
                    className="px-2 py-1 text-xs border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    View
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
