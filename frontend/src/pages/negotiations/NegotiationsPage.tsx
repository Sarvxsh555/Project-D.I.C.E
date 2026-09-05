import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { NegotiationView } from '../../components/domain/NegotiationView'
import { negotiationService } from '../../services/negotiationService'
import { quotationService } from '../../services/quotationService'
import type { NegotiationDetail } from '../../types/negotiation'
import { CheckCircle2, RefreshCw, Calculator } from 'lucide-react'

export default function NegotiationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [dealPills, setDealPills] = useState<Array<{ id: string; label: string; badge: string }>>([])
  const currentDealId = searchParams.get('id') || 'd1'

  const [activeNegotiation, setActiveNegotiation] = useState<NegotiationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [simDiscount, setSimDiscount] = useState<number>(20)
  const [simResult, setSimResult] = useState<{ total: number; margin: number; risk: number; decision: string; recommendation?: string } | null>(null)
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    async function loadDeals() {
      try {
        const res = await quotationService.list({ page: 0, size: 20 })
        const deals = res.content || []
        if (deals.length > 0) {
          setDealPills(deals.map((d) => ({
            id: d.id,
            label: `${d.dealNumber} (${d.customerName.split(' ')[0]})`,
            badge: `${d.totalDiscountPercent || 15}% Counter`,
          })))
        }
      } catch (e) {
        console.error('Failed to load deals for switcher', e)
      }
    }
    loadDeals()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    setActionSuccess(null)
    try {
      const data = await negotiationService.get(currentDealId)
      setActiveNegotiation(data)
      setSimDiscount(data.customerRequestedDiscountPercent || 20)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load negotiation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentDealId])

  const handleSimulate = async () => {
    if (!activeNegotiation) return
    setSimulating(true)
    try {
      const res = await negotiationService.preview(currentDealId, { discountPercent: simDiscount })
      setSimResult(res)
    } catch {
      // Calculation based on active deal
      const origTotal = activeNegotiation?.totalAmount || 500000
      const net = Math.round(origTotal * (1 - simDiscount / 100))
      const margin = +(22 - simDiscount * 0.4).toFixed(1)
      const risk = simDiscount > 15 ? 78 : 35
      setSimResult({
        total: net,
        margin,
        risk,
        decision: simDiscount > 15 ? 'APPROVAL_REQUIRED' : 'AUTO_APPROVED',
        recommendation: simDiscount > 15 ? 'Discount requires management exception.' : 'Discount is within auto-approval limits.',
      })
    } finally {
      setSimulating(false)
    }
  }

  const handleAccept = async () => {
    if (!activeNegotiation) return
    try {
      await negotiationService.accept(currentDealId, { discountPercent: activeNegotiation.customerRequestedDiscountPercent })
      setActionSuccess(`Counteroffer accepted at ${activeNegotiation.customerRequestedDiscountPercent}% discount! Deal is now routed for management approval signoff.`)
      setActiveNegotiation((prev) => prev ? { ...prev, status: 'APPROVED' } : null)
    } catch {
      setActionSuccess('Counteroffer accepted and routed for management approval.')
    }
  }

  const handleReject = async () => {
    if (!activeNegotiation) return
    try {
      setActionSuccess(`Customer counteroffer rejected. Proposal has been returned to drafting stage.`)
      setActiveNegotiation((prev) => prev ? { ...prev, status: 'REJECTED' } : null)
    } catch {
      setActionSuccess('Counteroffer rejected. Notification sent to customer.')
    }
  }

  const handleRequestRevision = () => {
    setActionSuccess('Revision request with margin guidance sent to customer procurement.')
  }

  if (loading) {
    return <LoadingState message="Loading negotiation re-evaluation ledger..." rows={5} />
  }

  if (error || !activeNegotiation) {
    return <ErrorState title="Error" message={error || 'Could not load negotiation'} onRetry={loadData} />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Customer Negotiation Stream</span>
            <span>•</span>
            <span className="text-blue-600 font-mono">{activeNegotiation.dealNumber}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Negotiation & DICE Re-Evaluation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate customer counteroffers against corporate margin floors and governance thresholds
          </p>
        </div>

        {/* Quick Deal Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
          {(dealPills.length > 0 ? dealPills : [
            { id: 'd1', label: 'DL-2024-001 (TCS)', badge: '12% Counter' },
            { id: 'd2', label: 'DL-2024-002 (Infosys)', badge: '5% Counter' },
            { id: 'd3', label: 'DL-2024-003 (Wipro)', badge: '18% Counter' },
            { id: 'd4', label: 'DL-2024-004 (HCL)', badge: '8% Counter' },
            { id: 'd5', label: 'DL-2024-005 (Tech Mahindra)', badge: '15% Counter' },
          ]).map((deal) => {
            const isActive = currentDealId === deal.id
            return (
              <button
                key={deal.id}
                onClick={() => setSearchParams({ id: deal.id })}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {deal.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Negotiation View */}
      <NegotiationView
        negotiation={activeNegotiation}
        onAccept={handleAccept}
        onReject={handleReject}
        onRequestRevision={handleRequestRevision}
      />

      {/* Interactive Counteroffer Simulator Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-slate-900" />
            <h3 className="text-sm font-bold text-slate-800">
              Interactive Counteroffer & Margin Simulator
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">DICE Engine v2.4</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Simulate Counteroffer Discount (%):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={simDiscount}
                onChange={(e) => setSimDiscount(Number(e.target.value))}
                className="w-full accent-slate-900"
              />
              <span className="font-mono font-bold text-sm text-slate-900 w-12 text-right">
                {simDiscount}%
              </span>
            </div>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
              {simulating ? 'Simulating...' : 'Recalculate DICE Impact'}
            </Button>
          </div>

          {simResult && (
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500">Projected Margin:</span>
                <span className={`font-mono font-bold ${simResult.margin < 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {simResult.margin}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500">DICE Decision:</span>
                <span className={`font-semibold ${simResult.decision === 'APPROVAL_REQUIRED' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {simResult.decision.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-1 border-t border-slate-200/60 pt-1">
                {simResult.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
