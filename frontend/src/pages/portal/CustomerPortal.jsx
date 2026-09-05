import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr } from '../../quotationApi.js';
import { negotiationApi } from '../../negotiationApi.js';
import '../admin/admin.css';
import './portal.css';

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
    <div className="portal-shell">
      <header className="portal-topnav">
        <div className="portal-brand">DealFlow360 — {selected?.customerName || quotes[0]?.customerName || 'My quotations'}</div>
        <button type="button" onClick={logout}>Log out</button>
      </header>

      <main className="portal-main">
        <aside className="portal-list">
          <h2>My Quotations</h2>
          {quotes.length === 0 ? (
            <div className="admin-empty">No quotations yet.</div>
          ) : (
            quotes.map((q) => (
              <div
                key={q.id}
                className={`portal-quote-card ${selected?.id === q.id ? 'selected' : ''}`}
                onClick={() => openQuote(q)}
              >
                <div className="portal-quote-no">{q.quoteNo}</div>
                <div>{formatInr(q.total)}</div>
                <span className="pill medium">{STATUS_LABEL[q.stage] || q.stage}</span>
              </div>
            ))
          )}
        </aside>

        <section className="portal-detail">
          {error && <p className="status error">{error}</p>}
          {!selected ? (
            <div className="admin-empty">Select a quotation to view details.</div>
          ) : (
            <>
              <h1>{selected.quoteNo}</h1>
              <p className="ws-subtitle">
                Status: {STATUS_LABEL[selected.stage] || selected.stage}
                {selected.customerAccepted ? ' · You accepted these terms' : ''}
              </p>

              <div className="admin-table-wrap">
                <table className="admin-table">
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
                          <div className="row-actions">
                            <button onClick={() => setCommentLineId(l.id)}>Comment</button>
                            <button onClick={() => setCounterLineId(l.id)}>Counter</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="builder-totals">
                <div><div className="stat-label">Total</div><div className="stat-value">{formatInr(selected.total)}</div></div>
              </div>

              {commentLineId && (
                <div className="builder-panel" style={{ marginTop: '1rem' }}>
                  <h2>Comment on line</h2>
                  <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} style={{ width: '100%', minHeight: '60px' }} />
                  <div className="builder-actions">
                    <button className="admin-btn" disabled={busy} onClick={submitComment}>Submit</button>
                    <button className="admin-btn secondary" onClick={() => setCommentLineId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {counterLineId && (
                <div className="builder-panel" style={{ marginTop: '1rem' }}>
                  <h2>Counter Discount</h2>
                  <p className="ws-subtitle">Current: {selected.lines.find((l) => l.id === counterLineId)?.discountPercent}%</p>
                  <input placeholder="Proposed %" value={counterPercent} onChange={(e) => setCounterPercent(e.target.value)} style={{ width: '100px', marginBottom: '0.5rem' }} />
                  <textarea
                    placeholder="Reason (e.g. We can sign today if...)"
                    value={counterReason}
                    onChange={(e) => setCounterReason(e.target.value)}
                    style={{ width: '100%', minHeight: '60px' }}
                  />
                  <div className="builder-actions">
                    <button className="admin-btn" disabled={busy} onClick={submitCounter}>Submit Request</button>
                    <button className="admin-btn secondary" onClick={() => setCounterLineId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="builder-panel" style={{ marginTop: '1rem' }}>
                <h2>Request a change</h2>
                <textarea value={changeText} onChange={(e) => setChangeText(e.target.value)} style={{ width: '100%', minHeight: '60px' }} />
                <div className="builder-actions">
                  <button className="admin-btn secondary" disabled={busy} onClick={submitChangeRequest}>Submit Request</button>
                  {canConfirm && (
                    <button className="admin-btn" disabled={busy} onClick={confirmQuotation}>
                      Confirm quotation (accept current price)
                    </button>
                  )}
                </div>
                <p className="ws-subtitle" style={{ marginTop: '0.5rem' }}>
                  Confirming accepts the prices on this quote as-is. It does not submit a counter-offer.
                  Low-risk quotes are auto-approved; higher risk still goes to your sales manager.
                </p>
              </div>

              <div className="builder-panel" style={{ marginTop: '1rem' }}>
                <h2>Activity</h2>
                {events.length === 0 ? (
                  <div className="admin-empty">No activity yet.</div>
                ) : (
                  events.map((e) => (
                    <div key={e.id} style={{ padding: '0.4rem 0', borderBottom: '1px solid #f2f4f7', fontSize: '0.85rem' }}>
                      <strong>{e.event_type.replace('_', ' ')}</strong> - {e.message || JSON.stringify(e.payload)}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
