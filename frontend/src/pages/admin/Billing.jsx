import { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { billingApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import './admin.css';

export default function Billing() {
  const { token } = useAuth();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  const load = async (id) => {
    setError('');
    try {
      setBilling(await billingApi.getOrderBilling(token, id));
      setOrderId(id);
    } catch (err) {
      setError(err.message);
      setBilling(null);
    }
  };

  const oneTime = billing?.invoices.filter((i) => i.type === 'ONE_TIME') ?? [];
  const recurring = billing?.invoices.filter((i) => i.type === 'RECURRING') ?? [];

  const changeQuantity = async (subscriptionId) => {
    const newQuantity = prompt('New quantity?');
    if (!newQuantity) return;
    setBusy(true);
    setError('');
    try {
      await billingApi.changeQuantity(token, subscriptionId, Number(newQuantity));
      await load(orderId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelSubscription = async (subscriptionId) => {
    const reason = prompt('Cancellation reason?');
    if (!reason) return;
    setBusy(true);
    setError('');
    try {
      await billingApi.cancel(token, subscriptionId, reason);
      await load(orderId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCreditNote = async () => {
    if (!creditAmount || !creditReason) return;
    setBusy(true);
    setError('');
    try {
      await billingApi.addCreditNote(token, orderId, Number(creditAmount), creditReason);
      setCreditAmount('');
      setCreditReason('');
      await load(orderId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>Billing</h1>
      <p className="admin-subtitle">One-time and recurring lines, billing schedule, proration, credits and refunds.</p>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Order ID (e.g. 100)"
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(orderIdInput)}
        />
        <button className="admin-btn" onClick={() => load(orderIdInput)}>Look up</button>
      </div>

      {error && <p className="status error">{error}</p>}

      {billing && (
        <>
          <h1 style={{ fontSize: '1.1rem' }}>ORDER #{billing.orderId}</h1>

          <div className="builder-panel">
            <h2>ONE-TIME</h2>
            {oneTime.length === 0 ? (
              <div className="admin-empty">None</div>
            ) : (
              oneTime.flatMap((inv) => inv.lines).map((l) => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                  <span>{l.description}</span>
                  <span>{formatInr(l.amount)}</span>
                </div>
              ))
            )}
          </div>

          <div className="builder-panel" style={{ marginTop: '1rem' }}>
            <h2>RECURRING</h2>
            {billing.subscriptions.length === 0 ? (
              <div className="admin-empty">None</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Amount / cycle</th>
                      <th>Cycle</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.product_name}</td>
                        <td>{s.quantity}</td>
                        <td>{formatInr(s.quantity * s.unit_price)}/{s.billing_cycle.toLowerCase()}</td>
                        <td>{s.billing_cycle}</td>
                        <td>
                          <span className={`pill ${s.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{s.status}</span>
                        </td>
                        <td>
                          {s.status === 'ACTIVE' && (
                            <div className="row-actions">
                              <button onClick={() => changeQuantity(s.id)} disabled={busy}>Change quantity</button>
                              <button className="danger" onClick={() => cancelSubscription(s.id)} disabled={busy}>Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="builder-totals">
            <div>
              <div className="stat-label">Next billing</div>
              <div className="stat-value">
                {billing.nextBillingDate ? new Date(billing.nextBillingDate).toLocaleDateString() : '-'}
              </div>
            </div>
            <div>
              <div className="stat-label">Credit notes</div>
              <div className="stat-value">{formatInr(billing.creditNotes.reduce((s, c) => s + c.amount, 0))}</div>
            </div>
            <div>
              <div className="stat-label">Refunds</div>
              <div className="stat-value">{formatInr(billing.refunds.reduce((s, r) => s + r.amount, 0))}</div>
            </div>
          </div>

          <div className="builder-panel" style={{ marginTop: '1rem' }}>
            <h2>Billing schedule</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.schedules.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.period_start).toLocaleDateString()} - {new Date(s.period_end).toLocaleDateString()}</td>
                      <td>{formatInr(s.amount)}</td>
                      <td><span className={`pill ${s.status === 'BILLED' ? 'active' : 'medium'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="builder-panel" style={{ marginTop: '1rem' }}>
            <h2>Issue credit note</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input placeholder="Amount" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} style={{ width: '120px' }} />
              <input placeholder="Reason" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} style={{ flex: 1 }} />
              <button className="admin-btn" disabled={busy} onClick={submitCreditNote}>Issue</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
