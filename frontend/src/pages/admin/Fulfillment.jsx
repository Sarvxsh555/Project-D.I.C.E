import { useEffect, useState } from 'react';
import { Search, Plus, Truck } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { fulfillmentApi, dealApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import Badge from '../../components/Badge.jsx';

const PLAN_STAGES = ['PROPOSED', 'ACCEPTED', 'SHIPPED'];
const PLAN_STAGE_LABEL = { PROPOSED: 'Proposed', ACCEPTED: 'Accepted', SHIPPED: 'Shipped' };

function PlanStepper({ status }) {
  const currentIdx = PLAN_STAGES.indexOf(status);
  return (
    <div className="card p-3 mb-4 flex items-center gap-1 overflow-x-auto">
      {PLAN_STAGES.map((stage, i) => {
        const done = i <= currentIdx;
        return (
          <div key={stage} className="flex items-center">
            <div
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                i === currentIdx
                  ? 'bg-odoo-600 text-white'
                  : done
                  ? 'bg-odoo-50 text-odoo-700'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {PLAN_STAGE_LABEL[stage]}
            </div>
            {i < PLAN_STAGES.length - 1 && <div className="w-4 h-px bg-gray-200 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function ShipmentProgressBar({ shipped, backorder }) {
  const total = shipped + backorder;
  if (total === 0) return null;
  const shippedPct = Math.round((shipped / total) * 100);
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{shippedPct}% ready to ship</span>
        <span>{shipped} / {total} units</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
        <div className="h-full bg-odoo-500" style={{ width: `${shippedPct}%` }} />
        <div className="h-full bg-red-300" style={{ width: `${100 - shippedPct}%` }} />
      </div>
    </div>
  );
}

export default function Fulfillment() {
  const { token } = useAuth();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [orders, setOrders] = useState(null);
  const [ordersError, setOrdersError] = useState('');
  const [order, setOrder] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [overrideLines, setOverrideLines] = useState([{ productId: '', warehouseId: '', quantity: '' }]);
  const [showOverride, setShowOverride] = useState(false);

  useEffect(() => {
    dealApi
      .listMine(token)
      .then(setOrders)
      .catch((err) => setOrdersError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrder = async (idOverride) => {
    const id = idOverride ?? orderIdInput;
    if (!id) return;
    setError('');
    try {
      const o = await dealApi.getOrder(token, id);
      setOrder(o);
      setOrderIdInput(String(id));
      try {
        setPlan(await fulfillmentApi.getByOrder(token, id));
      } catch {
        setPlan(null);
      }
    } catch (err) {
      setError(err.message);
      setOrder(null);
      setPlan(null);
    }
  };

  const propose = async () => {
    setBusy(true);
    setError('');
    try {
      setPlan(await fulfillmentApi.propose(token, order.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      setPlan(await fulfillmentApi.accept(token, plan.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitOverride = async () => {
    setBusy(true);
    setError('');
    try {
      const lines = overrideLines
        .filter((l) => l.productId && l.warehouseId && l.quantity)
        .map((l) => ({ productId: Number(l.productId), warehouseId: Number(l.warehouseId), quantity: Number(l.quantity) }));
      setPlan(await fulfillmentApi.override(token, plan.id, lines));
      setShowOverride(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const requiredQty = order?.lines?.reduce((s, l) => s + l.quantity, 0) ?? 0;
  const shippedQty = plan?.lines?.filter((l) => !l.backordered).reduce((s, l) => s + l.quantity, 0) ?? 0;
  const backorderQty = plan?.lines?.filter((l) => l.backordered).reduce((s, l) => s + l.quantity, 0) ?? 0;

  return (
    <div>
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <Truck size={20} />
        </span>
        Fulfillment
      </h1>
      <p className="page-subtitle">Warehouse split, shipment estimate and backorders for an order.</p>

      <div className="toolbar">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 max-w-xs"
            placeholder="Order ID (e.g. 2)"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadOrder()}
          />
        </div>
        <button className="btn-primary" onClick={loadOrder}>
          Look up
        </button>
      </div>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      {!order && (
        <div className="panel mb-4">
          <h2 className="font-bold text-odooink mb-3">Orders</h2>
          {ordersError && <p className="status-banner-error mb-3">{ordersError}</p>}
          {!ordersError && orders === null && <div className="empty-state py-4">Loading orders...</div>}
          {orders && orders.length === 0 && <div className="empty-state py-4">No orders yet.</div>}
          {orders && orders.length > 0 && (
            <div className="space-y-2">
              {orders.map((o) => (
                <button
                  key={o.id}
                  className="w-full text-left rounded-lg border border-gray-100 hover:border-odoo-200 p-3 text-sm flex items-center justify-between"
                  onClick={() => loadOrder(o.id)}
                >
                  <span className="font-semibold text-odooink">{o.orderNo}</span>
                  <span className="text-gray-500">{o.customerName}</span>
                  <Badge tone="gray">{o.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {order && (
        <div className="panel">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-odooink">
              {order.orderNo} - {order.customerName}
            </h2>
            <button
              className="link-action"
              onClick={() => {
                setOrder(null);
                setPlan(null);
                setOrderIdInput('');
              }}
            >
              Back to orders
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Required: {requiredQty}</p>

          {!plan ? (
            <button className="btn-primary" disabled={busy} onClick={propose}>
              Propose warehouse split
            </button>
          ) : (
            <>
              <PlanStepper status={plan.status} />
              <ShipmentProgressBar shipped={shippedQty} backorder={backorderQty} />
              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Warehouse</th>
                      <th>Qty</th>
                      <th>Shipping cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.backordered ? <Badge tone="red">Backorder</Badge> : l.warehouseName}</td>
                        <td>{l.quantity}</td>
                        <td>{l.backordered ? '-' : formatInr(l.shippingCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="stat-grid mt-4">
                <div className="stat-card">
                  <div className="stat-label">Shipment count</div>
                  <div className="stat-value text-lg">{plan.shipmentCount}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Shipping cost</div>
                  <div className="stat-value text-lg">{formatInr(plan.totalShippingCost)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Shipped</div>
                  <div className="stat-value text-lg">{shippedQty}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Backorder</div>
                  <div className="stat-value text-lg">{backorderQty}</div>
                </div>
              </div>

              {plan.status === 'PROPOSED' && (
                <div className="panel-actions">
                  <button className="btn-primary" disabled={busy} onClick={accept}>
                    Accept Suggested Split
                  </button>
                  <button className="btn-secondary" disabled={busy} onClick={() => setShowOverride((s) => !s)}>
                    Manual Override
                  </button>
                </div>
              )}

              {showOverride && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-odooink mb-3">Manual override lines</h3>
                  <div className="space-y-3">
                    {overrideLines.map((l, i) => (
                      <div key={i} className="flex gap-3">
                        <input
                          className="input"
                          placeholder="Product ID"
                          value={l.productId}
                          onChange={(e) => {
                            const next = [...overrideLines];
                            next[i].productId = e.target.value;
                            setOverrideLines(next);
                          }}
                        />
                        <input
                          className="input"
                          placeholder="Warehouse ID"
                          value={l.warehouseId}
                          onChange={(e) => {
                            const next = [...overrideLines];
                            next[i].warehouseId = e.target.value;
                            setOverrideLines(next);
                          }}
                        />
                        <input
                          className="input"
                          placeholder="Quantity"
                          value={l.quantity}
                          onChange={(e) => {
                            const next = [...overrideLines];
                            next[i].quantity = e.target.value;
                            setOverrideLines(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="panel-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => setOverrideLines([...overrideLines, { productId: '', warehouseId: '', quantity: '' }])}
                    >
                      <Plus size={15} />
                      Add line
                    </button>
                    <button className="btn-primary" disabled={busy} onClick={submitOverride}>
                      Submit Override
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
