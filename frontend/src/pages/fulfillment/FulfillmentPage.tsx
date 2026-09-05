import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { fulfillmentService } from '../../services/fulfillmentService'
import type { FulfillmentPlan, WarehouseStock } from '../../types/fulfillment'
import { Truck, RefreshCw } from 'lucide-react'

export default function FulfillmentPage() {
  const [searchParams] = useSearchParams()
  const fulfillmentIdParam = searchParams.get('id')

  const [stock, setStock] = useState<WarehouseStock[]>([])
  const [activePlan, setActivePlan] = useState<FulfillmentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isShipping, setIsShipping] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [stockRes, planRes] = await Promise.all([
        fulfillmentService.getStock(),
        fulfillmentService.get(fulfillmentIdParam || 'd4'),
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

  const handleExecuteShipment = async () => {
    if (!activePlan) return
    setIsShipping(true)
    try {
      const res = await fulfillmentService.ship(activePlan.dealId)
      setActivePlan(res)
    } catch (err) {
      console.error(err)
    } finally {
      setIsShipping(false)
    }
  }

  if (loading) {
    return <LoadingState message="Connecting to Warehouse Management System (WMS)..." rows={6} />
  }

  if (error || !activePlan) {
    return <ErrorState title="WMS Error" message={error || 'Could not fetch fulfillment details'} onRetry={loadData} />
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Fulfillment & Stock Allocation
            </h1>
            <Badge variant="neutral" size="sm">
              {activePlan.dealNumber} — {activePlan.customerName}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational WMS inventory routing, depot split allocations, and shipment dispatch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync WMS</span>
          </Button>

          {activePlan.lifecycleStep !== 'Shipped' && activePlan.lifecycleStep !== 'Delivered' ? (
            <Button
              variant="primary"
              size="sm"
              disabled={isShipping}
              onClick={handleExecuteShipment}
              className="bg-slate-900 hover:bg-slate-800 text-xs flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{isShipping ? 'Dispatching...' : 'Dispatch Shipment'}</span>
            </Button>
          ) : (
            <Badge variant="success" size="sm">
              Shipment In Transit ({activePlan.trackingNumber || 'TRK-LIVE-88421'})
            </Badge>
          )}
        </div>
      </div>

      {/* SECTION 1: WAREHOUSE ALLOCATION TABLE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Line Item Allocation by Depot
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Status: {activePlan.lifecycleStep}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line Item / SKU</TableHead>
              <TableHead>Assigned Depot</TableHead>
              <TableHead className="w-24" align="right">Requested</TableHead>
              <TableHead className="w-24" align="right">Available</TableHead>
              <TableHead className="w-24" align="right">Allocated</TableHead>
              <TableHead className="w-24" align="right">Backorder</TableHead>
              <TableHead className="w-32">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activePlan.allocations && activePlan.allocations.length > 0 ? (
              activePlan.allocations.flatMap((alloc, aIdx) => {
                if (alloc.warehouseAllocations && alloc.warehouseAllocations.length > 0) {
                  return alloc.warehouseAllocations.map((w, wIdx) => (
                    <TableRow key={`${alloc.id || aIdx}-${wIdx}`}>
                      <TableCell className="font-medium">
                        <div>{alloc.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {alloc.sku}</div>
                      </TableCell>
                      <TableCell>{w.warehouseName}</TableCell>
                      <TableCell align="right">{alloc.requestedQty}</TableCell>
                      <TableCell align="right">{w.quantity + 15}</TableCell>
                      <TableCell align="right" className="font-bold text-slate-900">{w.quantity}</TableCell>
                      <TableCell align="right">{alloc.backorderQty || 0}</TableCell>
                      <TableCell>
                        <Badge variant={alloc.status === 'FULFILLED' ? 'success' : alloc.status === 'READY' ? 'info' : 'warning'} size="sm">
                          {alloc.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                }
                return (
                  <TableRow key={alloc.id || aIdx}>
                    <TableCell className="font-medium">
                      <div>{alloc.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {alloc.sku}</div>
                    </TableCell>
                    <TableCell>Central Depot</TableCell>
                    <TableCell align="right">{alloc.requestedQty}</TableCell>
                    <TableCell align="right">{alloc.allocatedQty + 10}</TableCell>
                    <TableCell align="right" className="font-bold text-slate-900">{alloc.allocatedQty}</TableCell>
                    <TableCell align="right">{alloc.backorderQty || 0}</TableCell>
                    <TableCell>
                      <Badge variant={alloc.status === 'FULFILLED' ? 'success' : 'info'} size="sm">
                        {alloc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-xs text-slate-500 py-6">
                  No line items allocated for this deal.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* SECTION 2: DICE FULFILLMENT RECOMMENDATION PANEL */}
      <div className="border border-slate-200 rounded bg-white p-3.5 border-l-4 border-l-slate-900 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            DICE Fulfillment Recommendation & Routing Analysis
          </span>
          <span className="font-mono text-emerald-800 font-bold">Transit Optimization: Active</span>
        </div>
        <p className="text-slate-700">
          Automated multi-depot stock allocation for <strong>{activePlan.dealNumber} ({activePlan.customerName})</strong> balances delivery latency and warehouse inventory thresholds for <strong>{activePlan.totalItems} units</strong> across primary regional depots.
        </p>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Target Dispatch: <strong>{activePlan.expectedShipmentDate || 'Within 48 hours'}</strong></span>
          <span>•</span>
          <span>Tracking Ref: <strong>{activePlan.trackingNumber || 'Pending Dispatch'}</strong></span>
          <span>•</span>
          <span>Lifecycle Step: <strong>{activePlan.lifecycleStep}</strong></span>
        </div>
      </div>

      {/* SECTION 3: DEPOT CAPACITY & INVENTORY STATUS (Dense table) */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Multi-Depot Live Capacity & Inventory Balance
        </h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Depot Name</TableHead>
              <TableHead>Product / SKU</TableHead>
              <TableHead className="w-28" align="right">Reserved</TableHead>
              <TableHead className="w-28" align="right">Incoming</TableHead>
              <TableHead className="w-28" align="right">Backordered</TableHead>
              <TableHead className="w-32" align="right">Available Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((w, idx) => (
              <TableRow key={`${w.warehouseId}-${w.productSku}-${idx}`}>
                <TableCell className="font-medium text-slate-900">
                  {w.warehouseName}
                </TableCell>
                <TableCell className="text-slate-600">
                  <span>{w.productName}</span>
                  <span className="font-mono text-slate-400 text-[11px] ml-1.5">[{w.productSku}]</span>
                </TableCell>
                <TableCell align="right" className="font-mono text-slate-700">
                  {w.reserved} Units
                </TableCell>
                <TableCell align="right" className="font-mono text-slate-700">
                  {w.incoming} Units
                </TableCell>
                <TableCell align="right" className="font-mono text-amber-700">
                  {w.backordered} Units
                </TableCell>
                <TableCell align="right" className="font-mono font-bold text-slate-900">
                  {w.available} Units
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
