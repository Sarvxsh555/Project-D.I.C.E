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

          {activePlan.lifecycleStep !== 'Shipped' ? (
            <Button
              variant="primary"
              size="sm"
              disabled={isShipping}
              onClick={handleExecuteShipment}
              className="bg-[#5E2A52] hover:bg-[#4B2141] text-xs flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{isShipping ? 'Dispatching...' : 'Dispatch Shipment'}</span>
            </Button>
          ) : (
            <Badge variant="success" size="sm">
              Shipment In Transit (AWB-984021)
            </Badge>
          )}
        </div>
      </div>

      {/* SECTION 1: WAREHOUSE ALLOCATION TABLE (Dense operational table) */}
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
            <TableRow>
              <TableCell className="font-medium">
                <div>Enterprise Cloud Platform (Core)</div>
                <div className="text-[10px] text-slate-400 font-mono">SKU: CLD-ENT-001</div>
              </TableCell>
              <TableCell>WH-A (Mumbai Central Depot)</TableCell>
              <TableCell align="right">20</TableCell>
              <TableCell align="right">45</TableCell>
              <TableCell align="right" className="font-bold text-slate-900">12</TableCell>
              <TableCell align="right">0</TableCell>
              <TableCell>
                <Badge variant="success" size="sm">Allocated</Badge>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-medium">
                <div>Enterprise Cloud Platform (Core)</div>
                <div className="text-[10px] text-slate-400 font-mono">SKU: CLD-ENT-001</div>
              </TableCell>
              <TableCell>WH-B (Bengaluru Tech Hub)</TableCell>
              <TableCell align="right">20</TableCell>
              <TableCell align="right">28</TableCell>
              <TableCell align="right" className="font-bold text-slate-900">8</TableCell>
              <TableCell align="right">0</TableCell>
              <TableCell>
                <Badge variant="success" size="sm">Allocated</Badge>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-medium">
                <div>High-Density Server Rack Unit</div>
                <div className="text-[10px] text-slate-400 font-mono">SKU: HW-RCK-092</div>
              </TableCell>
              <TableCell>WH-A (Mumbai Central Depot)</TableCell>
              <TableCell align="right">4</TableCell>
              <TableCell align="right" className="text-rose-700 font-bold">1</TableCell>
              <TableCell align="right">1</TableCell>
              <TableCell align="right" className="font-bold text-rose-700">3</TableCell>
              <TableCell>
                <Badge variant="warning" size="sm">Backorder (Expedited)</Badge>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-medium">
                <div>24x7 Priority Support SLA</div>
                <div className="text-[10px] text-slate-400 font-mono">SKU: SVC-SLA-001</div>
              </TableCell>
              <TableCell>HQ Technical Operations</TableCell>
              <TableCell align="right">1</TableCell>
              <TableCell align="right">Unlimited</TableCell>
              <TableCell align="right" className="font-bold text-slate-900">1</TableCell>
              <TableCell align="right">0</TableCell>
              <TableCell>
                <Badge variant="info" size="sm">Provisioned</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* SECTION 2: DICE FULFILLMENT RECOMMENDATION PANEL */}
      <div className="border border-slate-200 rounded bg-white p-3.5 border-l-4 border-l-[#5E2A52] space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            DICE Fulfillment Recommendation & Routing Analysis
          </span>
          <span className="font-mono text-emerald-800 font-bold">Transit Optimization: Active</span>
        </div>
        <p className="text-slate-700">
          Split inventory allocation across <strong>WH-A (12 units)</strong> and <strong>WH-B (8 units)</strong> minimizes regional interstate freight by <strong>₹18,400</strong> and ensures delivery SLA within <strong>48 hours</strong>.
        </p>
        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Courier Partner: <strong>BlueDart Express Air</strong></span>
          <span>•</span>
          <span>Transit SLA: <strong>Net 2 Days</strong></span>
          <span>•</span>
          <span>Dock Verification: <strong>Pre-Inspected</strong></span>
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
