import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { HybridBillingView } from '../../components/domain/HybridBillingView'
import { billingService } from '../../services/billingService'
import { formatCurrency } from '../../utils/currency'
import type { Subscription, HybridBillingDetail } from '../../types/billing'

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'subscriptions'

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [hybridBilling, setHybridBilling] = useState<HybridBillingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [subsRes, billingRes] = await Promise.all([
        billingService.listSubscriptions(),
        billingService.get('d-1042'),
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
  }, [])

  const handleGenerateInvoice = async () => {
    if (!hybridBilling) return
    try {
      await billingService.generateInvoice(hybridBilling.dealId)
      alert('Invoice generated successfully for Q-1042 milestone!')
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <LoadingState message="Loading recurring billing & hybrid revenue engine..." rows={5} />
  }

  if (error) {
    return <ErrorState title="Billing Error" message={error} onRetry={loadData} />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Billing & Subscriptions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hybrid revenue orchestration: one-time capital charges & recurring service contracts
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setSearchParams({ tab: 'subscriptions' })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'subscriptions'
                ? 'bg-white shadow-xs text-[#5E2A52] font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Subscriptions
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'hybrid-detail' })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'hybrid-detail'
                ? 'bg-white shadow-xs text-[#5E2A52] font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hybrid Billing (Q-1042)
          </button>
        </div>
      </div>

      {activeTab === 'subscriptions' ? (
        /* SCREEN 09: SUBSCRIPTIONS LIST */
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700">
              Contracted Recurring Plans
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {subscriptions.length} Active Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Plan Name</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Billing Interval</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">Next Billing</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{sub.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {sub.dealNumber}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {sub.planName}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#5E2A52]">
                      {formatCurrency(sub.amount)}
                      <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                    </td>
                    <td className="py-3.5 px-3">{sub.billingInterval}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-500">{sub.startDate}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-900 font-medium">
                      {sub.nextBillingDate}
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge variant={sub.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchParams({ tab: 'hybrid-detail' })}
                      >
                        View Schedule
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SCREEN 10: BILLING DETAIL (HYBRID BILLING) */
        hybridBilling && (
          <HybridBillingView
            billing={hybridBilling}
            onGenerateInvoice={handleGenerateInvoice}
          />
        )
      )}
    </div>
  )
}
