import { useState } from 'react';
import { Search, Receipt } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { billingApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import Badge from '../../components/Badge.jsx';

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
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <Receipt size={20} />
        </span>
        Billing
      </h1>
      <p className="page-subtitle">One-time and recurring lines, billing schedule, proration, credits and refunds.</p>

      <div className="toolbar">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 max-w-xs"
            placeholder="Order ID (e.g. 100)"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(orderIdInput)}
          />
        </div>
        <button className="btn-primary" onClick={() => load(orderIdInput)}>
          Look up
        </button>
      </div>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      {billing && (
        <>
          <h2 className="text-lg font-bold text-odooink mb-4">Order #{billing.orderId}</h2>

          <div className="panel">
            <h3 className="font-semibold text-odooink mb-3">One-time</h3>
            {oneTime.length === 0 ? (
              <div className="empty-state py-4">None</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {oneTime.flatMap((inv) => inv.lines).map((l) => (
                  <div key={l.id} className="flex justify-between py-2 text-sm">
                    <span className="text-odooink">{l.description}</span>
                    <span className="font-medium">{formatInr(l.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel mt-4">
            <h3 className="font-semibold text-odooink mb-3">Recurring</h3>
            {billing.subscriptions.length === 0 ? (
              <div className="empty-state py-4">None</div>
            ) : (
              <div className="table-wrap">
                <table className="table-base">
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
                          <Badge tone={s.status === 'ACTIVE' ? 'green' : 'gray'}>{s.status}</Badge>
                        </td>
                        <td>
                          {s.status === 'ACTIVE' && (
                            <div className="flex gap-3">
                              <button className="link-action" onClick={() => changeQuantity(s.id)} disabled={busy}>
                                Change quantity
                              </button>
                              <button className="link-action-danger" onClick={() => cancelSubscription(s.id)} disabled={busy}>
                                Cancel
                              </button>
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

          <div className="stat-grid mt-4">
            <div className="stat-card">
              <div className="stat-label">Next billing</div>
              <div className="stat-value text-lg">
                {billing.nextBillingDate ? new Date(billing.nextBillingDate).toLocaleDateString() : '-'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Credit notes</div>
              <div className="stat-value text-lg">{formatInr(billing.creditNotes.reduce((s, c) => s + c.amount, 0))}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Refunds</div>
              <div className="stat-value text-lg">{formatInr(billing.refunds.reduce((s, r) => s + r.amount, 0))}</div>
            </div>
          </div>

          <div className="panel mt-4">
            <h3 className="font-semibold text-odooink mb-3">Billing schedule</h3>
            <div className="table-wrap">
              <table className="table-base">
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
                      <td>
                        <Badge tone={s.status === 'BILLED' ? 'green' : 'amber'}>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel mt-4">
            <h3 className="font-semibold text-odooink mb-3">Issue credit note</h3>
            <div className="flex gap-3">
              <input
                className="input w-32"
                placeholder="Amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
              <input
                className="input flex-1"
                placeholder="Reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
              <button className="btn-primary" disabled={busy} onClick={submitCreditNote}>
                Issue
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
