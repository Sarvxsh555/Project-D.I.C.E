import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { WarehouseAllocationView } from '../../components/domain/WarehouseAllocationView'
import { fulfillmentService } from '../../services/fulfillmentService'
import type { FulfillmentPlan, WarehouseStock } from '../../types/fulfillment'
import { Truck, RefreshCw, Layers } from 'lucide-react'

export default function FulfillmentPage() {
  const [searchParams] = useSearchParams()
  const fulfillmentIdParam = searchParams.get('id')

  const [stock, setStock] = useState<WarehouseStock[]>([])
  const [activePlan, setActivePlan] = useState<FulfillmentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [stockRes, planRes] = await Promise.all([
        fulfillmentService.getStock(),
        fulfillmentService.get(fulfillmentIdParam || 'd-1042'),
      ])
      setStock(stockRes)
      setActivePlan(planRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fulfillment data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [fulfillmentIdParam])

  const handleAcceptSuggested = async () => {
    if (!activePlan) return
    try {
      const updated = await fulfillmentService.allocate(activePlan.dealId, [
        { warehouseName: 'Warehouse A (Mumbai Central)', quantity: 12 },
        { warehouseName: 'Warehouse B (Bengaluru Tech Hub)', quantity: 8 },
      ])
      setActivePlan(updated)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <LoadingState message="Connecting to Warehouse Management System (WMS)..." rows={5} />
  }

  if (error || !activePlan) {
    return <ErrorState title="WMS Error" message={error || 'Could not fetch fulfillment details'} onRetry={loadData} />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Operations & Logistics</span>
            <span>•</span>
            <span className="text-[#5E2A52] font-mono">{activePlan.dealNumber}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Fulfillment & Stock Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-depot inventory routing and delivery feasibility for {activePlan.customerName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-1.5 text-slate-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync WMS
          </Button>

          {activePlan.lifecycleStep === 'Allocated' && (
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                const res = await fulfillmentService.ship(activePlan.dealId)
                setActivePlan(res)
              }}
              className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              Dispatch Shipment
            </Button>
          )}
        </div>
      </div>

      {/* Main Allocation & Stock Component */}
      <WarehouseAllocationView
        plan={activePlan}
        stock={stock}
        onAcceptSuggested={handleAcceptSuggested}
        onManualOverride={() => alert('Manual allocation override enabled.')}
      />

      {/* Allocation Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-slate-500" />
          Itemized Line Allocation Schedule
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3 text-right">Requested Qty</th>
                <th className="py-2.5 px-3 text-right">Allocated Qty</th>
                <th className="py-2.5 px-3 text-right">Backorder</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Expected Shipment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activePlan.allocations.map((alloc) => (
                <tr key={alloc.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-medium text-slate-900">{alloc.productName}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{alloc.sku}</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-800">
                    {alloc.requestedQty}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    {alloc.allocatedQty}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 font-mono">
                    {alloc.backorderQty}
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={alloc.status === 'READY' ? 'success' : 'warning'}>
                      {alloc.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-500">
                    {alloc.expectedShipmentDate}
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
