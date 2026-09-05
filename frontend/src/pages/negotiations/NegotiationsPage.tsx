import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { NegotiationView } from '../../components/domain/NegotiationView'
import { negotiationService } from '../../services/negotiationService'
import type { NegotiationDetail } from '../../types/negotiation'
import { MessageSquare } from 'lucide-react'

export default function NegotiationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dealIdParam = searchParams.get('id')

  const [activeNegotiation, setActiveNegotiation] = useState<NegotiationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await negotiationService.get(dealIdParam || 'd-1042')
      setActiveNegotiation(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load negotiation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dealIdParam])

  const handleAccept = async () => {
    if (!activeNegotiation) return
    alert('Counteroffer routed for formal management approval signoff.')
  }

  const handleReject = async () => {
    if (!activeNegotiation) return
    alert('Counteroffer rejected. Notification sent to customer.')
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
            <span className="text-[#5E2A52] font-mono">{activeNegotiation.dealNumber}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Negotiation & DICE Re-Evaluation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate customer counteroffers against corporate margin floors and governance thresholds
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchParams({ id: 'd-1042' })}
          className="flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#5E2A52]" />
          Review Q-1042 (Acme)
        </Button>
      </div>

      {/* Main Negotiation View */}
      <NegotiationView
        negotiation={activeNegotiation}
        onAccept={handleAccept}
        onReject={handleReject}
        onRequestRevision={() => alert('Revision instructions drafted for customer.')}
      />
    </div>
  )
}
