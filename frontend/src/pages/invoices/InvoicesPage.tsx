import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { invoiceService } from '../../services/invoiceService'
import { formatCurrency } from '../../utils/currency'
import type { Invoice } from '../../types/billing'
import { ArrowLeft, Ban, DollarSign, Download, Printer } from 'lucide-react'

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
  // RENDER: INVOICE DETAIL (ENTERPRISE RECORD)
  // ==========================================
  if (invoiceIdParam) {
    if (detailLoading || !activeInvoice) {
      return <LoadingState message="Loading tax invoice statement..." rows={6} />
    }

    const isOverdue = activeInvoice.status === 'OVERDUE'
    const statusVariant =
      activeInvoice.status === 'PAID'
        ? 'success'
        : activeInvoice.status === 'OVERDUE'
        ? 'danger'
        : 'warning'

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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert(`Downloading official PDF statement for ${activeInvoice.invoiceNumber}...`)}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Tax Invoice (PDF)</span>
            </Button>
          </div>
        </div>

        {/* Invoice Statement Sheet */}
        <div className="bg-white border border-slate-200 rounded p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Tax Invoice
                </span>
                <Badge variant={statusVariant} size="sm">
                  {activeInvoice.status}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {activeInvoice.invoiceNumber}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Client: <strong className="text-slate-900">{activeInvoice.customerName}</strong> • Quotation: <strong className="font-mono text-[#5E2A52]">{activeInvoice.dealNumber}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeInvoice.status === 'DRAFT' && (
                <Button variant="primary" size="sm" onClick={handleIssue} className="bg-[#5E2A52] hover:bg-[#4B2141] text-xs">
                  Issue Invoice
                </Button>
              )}
              {activeInvoice.status === 'ISSUED' && (
                <Button variant="primary" size="sm" onClick={handleMarkPaid} className="bg-emerald-700 hover:bg-emerald-800 text-xs flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Mark as Paid
                </Button>
              )}
              {activeInvoice.status !== 'PAID' && activeInvoice.status !== 'CANCELLED' && (
                <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" />
                  Cancel Invoice
                </Button>
              )}
            </div>
          </div>

          {/* Tax Invoice Parties */}
          <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Billed By:</span>
              <strong className="text-slate-900 block text-sm">DealFlow360 Technologies India Pvt Ltd</strong>
              <p className="text-slate-600 mt-0.5">BKC Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051</p>
              <span className="font-mono text-slate-500 text-[11px] block mt-1">GSTIN: 27AAACD1234F1Z8</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Billed To:</span>
              <strong className="text-slate-900 block text-sm">{activeInvoice.customerName}</strong>
              <p className="text-slate-600 mt-0.5">Plot 45, MIDC Industrial Area, Andheri East, Mumbai 400093</p>
              <span className="font-mono text-slate-500 text-[11px] block mt-1">GSTIN: 27AABCA1234F1Z5 • Payment Terms: Net-30</span>
            </div>
          </div>

          {/* Dates & Reference Grid */}
          <div className="grid grid-cols-4 gap-4 text-xs border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Invoice Date</span>
              <span className="font-mono text-slate-900">{activeInvoice.issueDate || '2026-03-01'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Due Date</span>
              <span className={`font-mono font-bold ${isOverdue ? 'text-rose-700' : 'text-slate-900'}`}>
                {activeInvoice.dueDate || '2026-03-31'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Milestone Trigger</span>
              <span className="text-slate-700">Kickoff Advance (50%)</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Currency</span>
              <span className="font-mono text-slate-900">INR (₹)</span>
            </div>
          </div>

          {/* Billed Items Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description of Goods / Services</TableHead>
                <TableHead className="w-20" align="right">Qty</TableHead>
                <TableHead className="w-32" align="right">Unit Price</TableHead>
                <TableHead className="w-28" align="right">Tax (18%)</TableHead>
                <TableHead className="w-32" align="right">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-slate-400">01</TableCell>
                <TableCell className="font-medium text-slate-900">
                  <div>Enterprise Cloud Platform (Core) — Kickoff Milestone</div>
                  <div className="text-[10px] text-slate-400 font-mono">HSN/SAC: 998313 (Software as a Service)</div>
                </TableCell>
                <TableCell align="right">20</TableCell>
                <TableCell align="right">₹20,000</TableCell>
                <TableCell align="right" className="text-slate-500">₹33,102</TableCell>
                <TableCell align="right" className="font-bold text-slate-900 font-mono">
                  {formatCurrency(activeInvoice.amount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Financial Breakdown Total */}
          <div className="flex justify-end pt-2 text-xs">
            <div className="w-72 space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Taxable Subtotal:</span>
                <span className="font-mono">{formatCurrency(activeInvoice.amount / 1.18)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (9.0%):</span>
                <span className="font-mono">{formatCurrency((activeInvoice.amount / 1.18) * 0.09)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (9.0%):</span>
                <span className="font-mono">{formatCurrency((activeInvoice.amount / 1.18) * 0.09)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Total Invoice Value:</span>
                <span className="font-mono text-base">{formatCurrency(activeInvoice.amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // RENDER: INVOICES LEDGER (TABLE-FIRST)
  // ==========================================
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Invoices & Accounts Receivable
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit billed quotation milestones, track Net-30 aging, and monitor cash reconciliation
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
          {['ALL', 'PAID', 'ISSUED', 'DRAFT'].map((filter) => (
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
        <LoadingState message="Loading accounts receivable ledger..." rows={6} />
      ) : error ? (
        <ErrorState title="Error" message={error} onRetry={loadInvoices} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-28 font-mono">Quotation</TableHead>
              <TableHead className="w-32" align="right">Amount</TableHead>
              <TableHead className="w-28">Issue Date</TableHead>
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
                    className="font-mono font-bold text-[#5E2A52] hover:underline cursor-pointer text-left"
                  >
                    {inv.invoiceNumber}
                  </button>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {inv.customerName}
                </TableCell>
                <TableCell className="font-mono text-slate-600 text-xs">
                  {inv.dealNumber}
                </TableCell>
                <TableCell align="right" className="font-bold font-mono text-slate-900">
                  {formatCurrency(inv.amount)}
                </TableCell>
                <TableCell className="font-mono text-slate-500 text-xs">
                  {inv.issueDate || inv.issuedDate || '2026-03-01'}
                </TableCell>
                <TableCell className="font-mono text-slate-800 text-xs">
                  {inv.dueDate}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      inv.status === 'PAID'
                        ? 'success'
                        : inv.status === 'OVERDUE'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <button
                    type="button"
                    onClick={() => setSearchParams({ id: inv.id })}
                    className="px-2 py-1 text-xs border border-slate-300 rounded text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Statement
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
