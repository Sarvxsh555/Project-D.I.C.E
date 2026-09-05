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
  const activeToken = urlToken || searchParams.get('token') || 'portal-token-q1042-acme'

  const [quote, setQuote] = useState<PortalQuoteView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Counteroffer modal state
  const [isCounterofferOpen, setIsCounterofferOpen] = useState(
    searchParams.get('action') === 'negotiate'
  )
  const [requestedDiscount, setRequestedDiscount] = useState<number>(22)
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
    <div className="space-y-6">
      {/* Submission Success Banner */}
      {submittedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Counteroffer Submitted</h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              Your proposed discount and terms have been transmitted to your dedicated account executive.
              The sales team will review your proposal and update your agreement shortly.
            </p>
          </div>
        </div>
      )}

      {/* Quote Document Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Official Commercial Proposal
              </span>
              <Badge variant="primary">{quote.status.replace('_', ' ')}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Quotation {quote.dealNumber}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Prepared exclusively for: <strong className="text-slate-800">{quote.customerName}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Total Proposed Investment
            </span>
            <span className="text-2xl font-bold text-[#5E2A52] font-mono">
              {formatCurrency(quote.totalAmount)}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Payment Terms: {quote.paymentTerms}
            </span>
          </div>
        </div>

        {/* Customer Commercial Item Table (STRICTLY HIDING COSTS & MARGINS) */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Unit List Price</th>
                <th className="py-2.5 px-3 text-right">Total Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {quote.lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-slate-900">{line.productName}</td>
                  <td className="py-3 px-3 text-right">{line.quantity}</td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Customer Actions Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Offer Valid Until: <strong>{quote.validUntil}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={quote.status === 'CANCELLED' || quote.status === 'CONFIRMED'}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Decline Quote
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCounterofferOpen(true)}
              disabled={quote.status === 'CANCELLED' || quote.status === 'CONFIRMED'}
              className="text-[#5E2A52] border-[#5E2A52]/30 hover:bg-[#FAF5F9]"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Propose Counteroffer
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAccept}
              disabled={quote.status === 'CONFIRMED' || quote.status === 'CANCELLED'}
              className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accept Quote
            </Button>
          </div>
        </div>
      </div>

      {/* Customer Progression Timeline */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-4">
          Quotation Review Milestone Timeline
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {customerTimelineSteps.map((step, i) => (
            <div
              key={step.title}
              className={`p-3 rounded-lg border text-xs ${
                step.status === 'completed'
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  : step.status === 'current'
                  ? 'bg-purple-50/50 border-purple-200 text-[#5E2A52] font-semibold'
                  : 'bg-slate-50/50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1 font-mono">
                Step 0{i + 1}
              </div>
              <div className="font-bold">{step.title}</div>
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
                className="w-24 px-3 py-2 border border-slate-200 rounded text-xs font-mono font-bold text-[#5E2A52] focus:ring-1 focus:ring-[#5E2A52]"
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
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
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
              className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5"
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
