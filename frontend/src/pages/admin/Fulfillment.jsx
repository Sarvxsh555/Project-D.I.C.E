import { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { fulfillmentApi, dealApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import './admin.css';

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
      <h1>Fulfillment</h1>
      <p className="admin-subtitle">Warehouse split, shipment estimate and backorders for an order.</p>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Order ID (e.g. 2)"
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadOrder()}
        />
        <button className="admin-btn" onClick={loadOrder}>Look up</button>
      </div>

      {error && <p className="status error">{error}</p>}

      {order && (
        <div className="builder-panel">
          <h2>
            {order.orderNo} - {order.customerName}
          </h2>
          <p className="ws-subtitle">Required: {requiredQty}</p>

          {!plan ? (
            <button className="admin-btn" disabled={busy} onClick={propose}>
              Propose warehouse split
            </button>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
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
                        <td>{l.backordered ? <span className="pill high">Backorder</span> : l.warehouseName}</td>
                        <td>{l.quantity}</td>
                        <td>{l.backordered ? '-' : formatInr(l.shippingCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="builder-totals">
                <div>
                  <div className="stat-label">Shipment count</div>
                  <div className="stat-value">{plan.shipmentCount}</div>
                </div>
                <div>
                  <div className="stat-label">Shipping cost</div>
                  <div className="stat-value">{formatInr(plan.totalShippingCost)}</div>
                </div>
                <div>
                  <div className="stat-label">Shipped</div>
                  <div className="stat-value">{shippedQty}</div>
                </div>
                <div>
                  <div className="stat-label">Backorder</div>
                  <div className="stat-value">{backorderQty}</div>
                </div>
                <div>
                  <div className="stat-label">Status</div>
                  <div className="stat-value">{plan.status}</div>
                </div>
              </div>

              {plan.status === 'PROPOSED' && (
                <div className="builder-actions">
                  <button className="admin-btn" disabled={busy} onClick={accept}>
                    Accept Suggested Split
                  </button>
                  <button className="admin-btn secondary" disabled={busy} onClick={() => setShowOverride((s) => !s)}>
                    Manual Override
                  </button>
                </div>
              )}

              {showOverride && (
                <div style={{ marginTop: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem' }}>Manual override lines</h3>
                  {overrideLines.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        placeholder="Product ID"
                        value={l.productId}
                        onChange={(e) => {
                          const next = [...overrideLines];
                          next[i].productId = e.target.value;
                          setOverrideLines(next);
                        }}
                      />
                      <input
                        placeholder="Warehouse ID"
                        value={l.warehouseId}
                        onChange={(e) => {
                          const next = [...overrideLines];
                          next[i].warehouseId = e.target.value;
                          setOverrideLines(next);
                        }}
                      />
                      <input
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
                  <div className="builder-actions">
                    <button
                      className="admin-btn secondary"
                      onClick={() => setOverrideLines([...overrideLines, { productId: '', warehouseId: '', quantity: '' }])}
                    >
                      + Add line
                    </button>
                    <button className="admin-btn" disabled={busy} onClick={submitOverride}>
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
