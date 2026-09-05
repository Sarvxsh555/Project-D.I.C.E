import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { portalService } from '../../services/negotiationService'
import { formatCurrency } from '../../utils/currency'
import type { PortalQuoteView } from '../../types/negotiation'
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  Calendar,
} from 'lucide-react'

export default function PortalPage() {
  const { token: urlToken } = useParams<{ token?: string }>()
  const [searchParams] = useSearchParams()
  const activeToken = urlToken || searchParams.get('token') || 'd1'

  const [quote, setQuote] = useState<PortalQuoteView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Counteroffer modal state
  const [isCounterofferOpen, setIsCounterofferOpen] = useState(
    searchParams.get('action') === 'negotiate'
  )
  const [requestedDiscount, setRequestedDiscount] = useState<number>(15)
  const [counterMessage, setCounterMessage] = useState(
    'We can proceed at this price.'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  const loadQuote = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await portalService.getQuote(activeToken)
      setQuote(data)
      if (data?.totalDiscountPercent) {
        setRequestedDiscount(data.totalDiscountPercent)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired customer portal token')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuote()
  }, [activeToken])

  const handleAccept = async () => {
    try {
      await portalService.accept(activeToken)
      setQuote((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : null))
    } catch (err) {
      console.error(err)
    }
  }

  const handleReject = async () => {
    try {
      await portalService.reject(activeToken)
      setQuote((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmitCounteroffer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const updated = await portalService.counteroffer(activeToken, {
        requestedDiscountPercent: requestedDiscount,
        message: counterMessage,
      })
      setQuote(updated)
      setIsCounterofferOpen(false)
      setSubmittedSuccess(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingState message="Decrypting and verifying commercial quote token..." rows={4} />
  }

  if (error || !quote) {
    return (
      <ErrorState
        title="Quote Unavailable"
        message={error || 'The requested quotation link is invalid or expired.'}
        onRetry={loadQuote}
      />
    )
  }

  const customerTimelineSteps = [
    { title: 'Quotation Sent', status: 'completed', date: '04 Sep 2026' },
    { title: 'Viewed by Customer', status: 'completed', date: '05 Sep 2026' },
    {
      title: 'Counteroffer Submitted',
      status: quote.status === 'NEGOTIATION' || submittedSuccess ? 'completed' : 'pending',
      date: quote.status === 'NEGOTIATION' ? '05 Sep 2026' : undefined,
    },
    {
      title: 'Sales Review',
      status: quote.status === 'NEGOTIATION' || submittedSuccess ? 'current' : 'pending',
    },
    {
      title: 'Updated Final Agreement',
      status: quote.status === 'CONFIRMED' ? 'completed' : 'pending',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Submission Success Banner */}
      {submittedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3.5 flex items-start gap-3 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-xs">Counteroffer Transmitted</h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              Your proposed discount and terms have been routed directly to your account executive.
              You will be notified once sales operations reviews the updated terms.
            </p>
          </div>
        </div>
      )}

      {/* Quote Document Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs relative overflow-hidden">
        <div className="h-1 bg-slate-900 w-full absolute top-0 left-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-5 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                Commercial Proposal
              </span>
              <Badge variant="primary">{quote.status.replace('_', ' ')}</Badge>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Quotation {quote.dealNumber}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Prepared for: <strong className="text-slate-800 font-medium">{quote.customerName}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold font-mono">
              Total Proposed Investment
            </span>
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {formatCurrency(quote.totalAmount)}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              Payment Terms: <span className="font-medium text-slate-700">{quote.paymentTerms}</span>
            </span>
          </div>
        </div>

        {/* Customer Commercial Item Table (STRICTLY HIDING COSTS & MARGINS) */}
        <div className="mt-5 overflow-x-auto border border-slate-200/90 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-700 border-b border-slate-200/90 font-mono">
              <tr>
                <th className="py-2.5 px-4">Item Description</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-right">Unit List Price</th>
                <th className="py-2.5 px-4 text-right">Total Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {quote.lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-medium text-slate-900">{line.productName}</td>
                  <td className="py-3 px-4 text-right font-mono">{line.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-600 font-mono">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Taxes */}
        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Net:</span>
              <span className="font-mono font-medium text-slate-900">{formatCurrency(quote.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated GST (18%):</span>
              <span className="font-mono font-medium text-slate-900">{formatCurrency(Math.round(quote.totalAmount * 0.18))}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200/90 pt-2 font-bold text-slate-900">
              <span>Total Payable:</span>
              <span className="font-mono text-slate-900 text-sm">
                {formatCurrency(Math.round(quote.totalAmount * 1.18))}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Actions Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Offer Valid Until: <strong className="font-medium text-slate-700">{quote.validUntil}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={quote.status === 'CANCELLED' || quote.status === 'CONFIRMED'}
              className="text-rose-700 border-rose-200 hover:bg-rose-50 rounded-xl text-xs py-1.5 px-3 font-medium"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Decline
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCounterofferOpen(true)}
              disabled={quote.status === 'CANCELLED' || quote.status === 'CONFIRMED'}
              className="text-slate-900 border-slate-200 hover:bg-slate-50 rounded-xl text-xs py-1.5 px-3 font-medium shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Propose Counteroffer
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAccept}
              disabled={quote.status === 'CONFIRMED' || quote.status === 'CANCELLED'}
              className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 rounded-xl text-xs py-1.5 px-3 font-semibold shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accept Proposal
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Progression Timeline */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
        <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-3 font-mono">
          Proposal Status & Progression
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {customerTimelineSteps.map((step, i) => (
            <div
              key={step.title}
              className={`p-3 rounded-xl border text-xs ${
                step.status === 'completed'
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  : step.status === 'current'
                  ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                  : 'bg-slate-50/50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider mb-0.5 font-mono">
                Step 0{i + 1}
              </div>
              <div className="font-medium">{step.title}</div>
              {step.date && (
                <div className="text-[10px] text-slate-400 mt-1 font-mono">{step.date}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Counteroffer Modal */}
      <Modal
        isOpen={isCounterofferOpen}
        onClose={() => setIsCounterofferOpen(false)}
        title="Submit Commercial Counteroffer"
      >
        <form onSubmit={handleSubmitCounteroffer} className="space-y-4">
          <p className="text-xs text-slate-600">
            Submit your target pricing requirement. Your account team will review your proposal with sales operations leadership.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Requested Commercial Package Discount:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={40}
                value={requestedDiscount}
                onChange={(e) => setRequestedDiscount(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-slate-200 rounded text-xs font-mono font-semibold text-blue-600 focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-500 font-medium">%</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Currently offered: {quote.currentDiscountPercent}%
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Procurement Message / Notes:
            </label>
            <textarea
              rows={3}
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900"
              placeholder="e.g. We can proceed at this price."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCounterofferOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Submit Counteroffer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
