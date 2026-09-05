import { useEffect, useState } from 'react';
import { LogOut, Inbox, FileSearch, Activity } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr } from '../../quotationApi.js';
import { negotiationApi } from '../../negotiationApi.js';
import Badge from '../../components/Badge.jsx';

const STATUS_LABEL = {
  DRAFT: 'Sent',
  PENDING_APPROVAL: 'Sent',
  NEGOTIATION: 'Under Negotiation',
  APPROVED: 'Confirmed',
  ORDERED: 'Confirmed',
  FULFILLMENT: 'Confirmed',
  COMPLETED: 'Confirmed',
};

export default function CustomerPortal() {
  const { token, customerId, logout } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [commentLineId, setCommentLineId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [counterLineId, setCounterLineId] = useState(null);
  const [counterPercent, setCounterPercent] = useState('');
  const [counterReason, setCounterReason] = useState('');
  const [changeText, setChangeText] = useState('');

  const loadQuotes = () => {
    quotationApi
      .list(token, { customerId, size: 50, sortBy: 'createdAt', direction: 'DESC' })
      .then((data) => setQuotes(data.content))
      .catch((err) => setError(err.message));
  };

  useEffect(loadQuotes, [token, customerId]);

  const openQuote = async (q) => {
    setError('');
    try {
      const full = await quotationApi.get(token, q.id);
      setSelected(full);
      setEvents(await negotiationApi.events(token, q.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshSelected = async () => {
    const full = await quotationApi.get(token, selected.id);
    setSelected(full);
    setEvents(await negotiationApi.events(token, selected.id));
    loadQuotes();
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    setError('');
    try {
      await negotiationApi.comment(token, selected.id, commentLineId, commentText);
      setCommentText('');
      setCommentLineId(null);
      await refreshSelected();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitChangeRequest = async () => {
    if (!changeText.trim()) return;
    setBusy(true);
    setError('');
    try {
      await negotiationApi.changeRequest(token, selected.id, changeText);
      setChangeText('');
      await refreshSelected();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCounter = async () => {
    if (!counterLineId || !counterPercent) return;
    setBusy(true);
    setError('');
    try {
      await negotiationApi.counterDiscount(token, selected.id, counterLineId, Number(counterPercent), counterReason);
      setCounterLineId(null);
      setCounterPercent('');
      setCounterReason('');
      await refreshSelected();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmQuotation = async () => {
    setBusy(true);
    setError('');
    try {
      await quotationApi.customerConfirm(token, selected.id);
      await refreshSelected();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const canConfirm =
    selected &&
    !selected.customerAccepted &&
    ['DRAFT', 'NEGOTIATION', 'APPROVED', 'PENDING_APPROVAL'].includes(selected.stage);

  return (
    <div className="min-h-screen bg-[#F7F5F6]">
      <header className="flex justify-between items-center bg-white border-b border-black/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-odoo-600 text-white flex items-center justify-center font-extrabold text-sm">
            D
          </div>
          <span className="font-extrabold text-odoo-700">
            DealFlow360 <span className="font-normal text-gray-400">/</span> {selected?.customerName || quotes[0]?.customerName || 'My quotations'}
          </span>
        </div>
        <button type="button" className="btn-ghost" onClick={logout}>
          <LogOut size={15} />
          Log out
        </button>
      </header>

      <main className="grid gap-6 p-6 lg:grid-cols-[280px_1fr]">
        <aside className="card p-4 h-fit">
          <h2 className="font-bold text-odooink mb-3">My Quotations</h2>
          {quotes.length === 0 ? (
            <div className="empty-state">
              <Inbox className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="font-medium text-gray-500">No quotations yet.</p>
              <p className="text-xs text-gray-400 mt-0.5">New quotes from your sales rep will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selected?.id === q.id ? 'border-odoo-500 bg-odoo-50' : 'border-gray-100 hover:border-odoo-200'
                  }`}
                  onClick={() => openQuote(q)}
                >
                  <div className="text-xs font-semibold text-gray-400 mb-0.5">{q.quoteNo}</div>
                  <div className="font-semibold text-odooink mb-1.5">{formatInr(q.total)}</div>
                  <Badge tone="amber">{STATUS_LABEL[q.stage] || q.stage}</Badge>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section>
          {error && <p className="status-banner-error mb-4">{error}</p>}
          {!selected ? (
            <div className="empty-state">
              <FileSearch className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="font-medium text-gray-500">Select a quotation to view details.</p>
              <p className="text-xs text-gray-400 mt-0.5">Pick one from the list on the left.</p>
            </div>
          ) : (
            <>
              <h1 className="page-title">{selected.quoteNo}</h1>
              <p className="page-subtitle">
                Status: {STATUS_LABEL[selected.stage] || selected.stage}
                {selected.customerAccepted ? ' · You accepted these terms' : ''}
              </p>

              <div className="table-wrap">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Discount</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.productName}</td>
                        <td>{l.quantity}</td>
                        <td>{formatInr(l.unitPrice)}</td>
                        <td>{l.discountPercent}%</td>
                        <td>{formatInr(l.lineTotal)}</td>
                        <td>
                          <div className="flex gap-3">
                            <button className="link-action" onClick={() => setCommentLineId(l.id)}>Comment</button>
                            <button className="link-action" onClick={() => setCounterLineId(l.id)}>Counter</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card p-4 mt-4 inline-block">
                <div className="stat-label">Total</div>
                <div className="text-xl font-bold text-odooink">{formatInr(selected.total)}</div>
              </div>

              {commentLineId && (
                <div className="panel mt-4">
                  <h2 className="font-bold text-odooink mb-3">Comment on line</h2>
                  <textarea className="input w-full min-h-[70px] resize-y" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                  <div className="panel-actions">
                    <button className="btn-primary" disabled={busy} onClick={submitComment}>Submit</button>
                    <button className="btn-secondary" onClick={() => setCommentLineId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {counterLineId && (
                <div className="panel mt-4">
                  <h2 className="font-bold text-odooink mb-3">Counter Discount</h2>
                  <p className="text-sm text-gray-500 mb-3">Current: {selected.lines.find((l) => l.id === counterLineId)?.discountPercent}%</p>
                  <input className="input w-28 mb-3" placeholder="Proposed %" value={counterPercent} onChange={(e) => setCounterPercent(e.target.value)} />
                  <textarea
                    className="input w-full min-h-[70px] resize-y"
                    placeholder="Reason (e.g. We can sign today if...)"
                    value={counterReason}
                    onChange={(e) => setCounterReason(e.target.value)}
                  />
                  <div className="panel-actions">
                    <button className="btn-primary" disabled={busy} onClick={submitCounter}>Submit Request</button>
                    <button className="btn-secondary" onClick={() => setCounterLineId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="panel mt-4">
                <h2 className="font-bold text-odooink mb-3">Request a change</h2>
                <textarea className="input w-full min-h-[70px] resize-y" value={changeText} onChange={(e) => setChangeText(e.target.value)} />
                <div className="panel-actions">
                  <button className="btn-secondary" disabled={busy} onClick={submitChangeRequest}>Submit Request</button>
                  {canConfirm && (
                    <button className="btn-primary" disabled={busy} onClick={confirmQuotation}>
                      Confirm quotation (accept current price)
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Confirming accepts the prices on this quote as-is. It does not submit a counter-offer.
                  Low-risk quotes are auto-approved; higher risk still goes to your sales manager.
                </p>
              </div>

              <div className="panel mt-4">
                <h2 className="font-bold text-odooink mb-4 flex items-center gap-2">
                  <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5"><Activity size={16} /></span>
                  Activity
                </h2>
                {events.length === 0 ? (
                  <div className="empty-state">
                    <Activity className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="font-medium text-gray-500">No activity yet.</p>
                    <p className="text-xs text-gray-400 mt-0.5">Comments and negotiation events will appear here.</p>
                  </div>
                ) : (
                  <div className="relative pl-5">
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {events.map((e) => (
                        <div key={e.id} className="relative">
                          <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-odoo-500 ring-4 ring-odoo-50" />
                          <p className="text-sm text-odooink">
                            <strong className="font-semibold">{e.event_type.replace('_', ' ')}</strong>
                            {' — '}
                            {e.message || JSON.stringify(e.payload)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
