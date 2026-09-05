import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { fulfillmentApi, dealApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import Badge from '../../components/Badge.jsx';

export default function Fulfillment() {
  const { token } = useAuth();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [order, setOrder] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [overrideLines, setOverrideLines] = useState([{ productId: '', warehouseId: '', quantity: '' }]);
  const [showOverride, setShowOverride] = useState(false);

  const loadOrder = async () => {
    if (!orderIdInput) return;
    setError('');
    try {
      const o = await dealApi.getOrder(token, orderIdInput);
      setOrder(o);
      try {
        setPlan(await fulfillmentApi.getByOrder(token, orderIdInput));
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
      <h1 className="page-title">Fulfillment</h1>
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

      {order && (
        <div className="panel">
          <h2 className="font-bold text-odooink mb-1">
            {order.orderNo} - {order.customerName}
          </h2>
          <p className="text-sm text-gray-500 mb-4">Required: {requiredQty}</p>

          {!plan ? (
            <button className="btn-primary" disabled={busy} onClick={propose}>
              Propose warehouse split
            </button>
          ) : (
            <>
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
                <div className="stat-card">
                  <div className="stat-label">Status</div>
                  <div className="stat-value text-lg">{plan.status}</div>
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
