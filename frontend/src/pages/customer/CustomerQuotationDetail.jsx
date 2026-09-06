import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Activity, History } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr } from '../../quotationApi.js';
import { negotiationApi } from '../../negotiationApi.js';
import AsyncState from '../../components/AsyncState.jsx';
import Badge from '../../components/Badge.jsx';
import { quotationStatusLabel } from '../../lib/customerStatus.js';

const TIMELINE = ['DRAFT', 'PENDING_APPROVAL', 'NEGOTIATION', 'APPROVED', 'ORDERED', 'FULFILLMENT', 'COMPLETED'];
const TIMELINE_LABEL = {
  DRAFT: 'Created',
  PENDING_APPROVAL: 'Under Review',
  NEGOTIATION: 'Negotiation',
  APPROVED: 'Approved',
  ORDERED: 'Order',
  FULFILLMENT: 'Fulfillment',
  COMPLETED: 'Completed',
};

export default function CustomerQuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [quote, setQuote] = useState(null);
  const [events, setEvents] = useState([]);
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [commentLineId, setCommentLineId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [counterLineId, setCounterLineId] = useState(null);
  const [counterPercent, setCounterPercent] = useState('');
  const [counterReason, setCounterReason] = useState('');
  const [changeText, setChangeText] = useState('');

  const load = () => {
    setError('');
    Promise.all([quotationApi.get(token, id), negotiationApi.events(token, id), negotiationApi.versions(token, id)])
      .then(([q, ev, vs]) => {
        setQuote(q);
        setEvents(ev);
        setVersions(vs);
      })
      .catch((err) => setError(err.message || 'Unable to load this quotation.'));
  };

  useEffect(load, [token, id]);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    setError('');
    try {
      await negotiationApi.comment(token, id, commentLineId, commentText);
      setCommentText('');
      setCommentLineId(null);
      load();
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
      await negotiationApi.changeRequest(token, id, changeText);
      setChangeText('');
      load();
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
      await negotiationApi.counterDiscount(token, id, counterLineId, Number(counterPercent), counterReason);
      setCounterLineId(null);
      setCounterPercent('');
      setCounterReason('');
      load();
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
      await quotationApi.customerConfirm(token, id);
      setShowConfirm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!quote && !error) {
    return <AsyncState loading />;
  }

  const canConfirm =
    quote &&
    !quote.customerAccepted &&
    ['DRAFT', 'NEGOTIATION', 'APPROVED', 'PENDING_APPROVAL'].includes(quote.stage);

  const lastTwoVersions = versions.slice(-2);
  const [prevVersion, latestVersion] =
    lastTwoVersions.length === 2 ? lastTwoVersions : [null, lastTwoVersions[0] || null];

  return (
    <div>
      <button className="link-action mb-3 inline-flex items-center gap-1" onClick={() => navigate('/customer/quotations')}>
        <ArrowLeft size={14} /> Back to quotations
      </button>

      <AsyncState loading={false} error={error} onRetry={load}>
        {quote && (
          <>
            <h1 className="page-title">{quote.quoteNo}</h1>
            <p className="page-subtitle">
              {quote.customerName} · Status: {quotationStatusLabel(quote.stage)}
              {quote.customerAccepted ? ' · You accepted these terms' : ''}
            </p>

            {/* Status timeline */}
            <div className="card p-4 mb-6 flex items-center gap-1 overflow-x-auto">
              {TIMELINE.map((stage, i) => {
                const currentIdx = TIMELINE.indexOf(quote.stage);
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
                      {TIMELINE_LABEL[stage]}
                    </div>
                    {i < TIMELINE.length - 1 && <div className="w-4 h-px bg-gray-200 mx-1" />}
                  </div>
                );
              })}
            </div>

            {/* Line items */}
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
                  {quote.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.productName}</td>
                      <td>{l.quantity}</td>
                      <td>{formatInr(l.unitPrice)}</td>
                      <td>{l.discountPercent}%</td>
                      <td>{formatInr(l.lineTotal)}</td>
                      <td>
                        <div className="flex gap-3">
                          <button className="link-action" onClick={() => setCommentLineId(l.id)}>
                            Comment
                          </button>
                          <button className="link-action" onClick={() => setCounterLineId(l.id)}>
                            Counter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price summary */}
            <div className="card p-4 mt-4 inline-block">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-right font-medium">{formatInr(quote.subtotal)}</span>
                <span className="text-gray-500">Discount</span>
                <span className="text-right font-medium">-{formatInr(quote.discountTotal)}</span>
                <span className="text-gray-500">Tax</span>
                <span className="text-right font-medium">{formatInr(quote.taxTotal)}</span>
                <span className="font-bold text-odooink pt-1 border-t border-gray-100">Grand Total</span>
                <span className="text-right font-bold text-odooink pt-1 border-t border-gray-100">
                  {formatInr(quote.total)}
                </span>
              </div>
            </div>

            {commentLineId && (
              <div className="panel mt-4">
                <h2 className="font-bold text-odooink mb-3">Comment on line</h2>
                <textarea
                  className="input w-full min-h-[70px] resize-y"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="panel-actions">
                  <button className="btn-primary" disabled={busy} onClick={submitComment}>
                    Submit
                  </button>
                  <button className="btn-secondary" onClick={() => setCommentLineId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {counterLineId && (
              <div className="panel mt-4">
                <h2 className="font-bold text-odooink mb-3">Counter Discount</h2>
                <p className="text-sm text-gray-500 mb-3">
                  Current: {quote.lines.find((l) => l.id === counterLineId)?.discountPercent}%
                </p>
                <input
                  className="input w-28 mb-3"
                  placeholder="Proposed %"
                  value={counterPercent}
                  onChange={(e) => setCounterPercent(e.target.value)}
                />
                <textarea
                  className="input w-full min-h-[70px] resize-y"
                  placeholder="Reason (e.g. We can sign today if...)"
                  value={counterReason}
                  onChange={(e) => setCounterReason(e.target.value)}
                />
                <div className="panel-actions">
                  <button className="btn-primary" disabled={busy} onClick={submitCounter}>
                    Submit Request
                  </button>
                  <button className="btn-secondary" onClick={() => setCounterLineId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="panel mt-4">
              <h2 className="font-bold text-odooink mb-3">Request a change</h2>
              <textarea
                className="input w-full min-h-[70px] resize-y"
                value={changeText}
                onChange={(e) => setChangeText(e.target.value)}
              />
              <div className="panel-actions">
                <button className="btn-secondary" disabled={busy} onClick={submitChangeRequest}>
                  Submit Request
                </button>
                {canConfirm && (
                  <button className="btn-primary" disabled={busy} onClick={() => setShowConfirm(true)}>
                    Accept Quotation
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Accepting confirms the prices on this quote as-is. It does not submit a counter-offer.
              </p>
            </div>

            {showConfirm && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
                <div className="card p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                  <h2 className="font-bold text-odooink mb-2">Accept this quotation?</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    {quote.quoteNo} · Total {formatInr(quote.total)}. This confirms you agree to these terms as-is.
                  </p>
                  <div className="panel-actions">
                    <button className="btn-primary" disabled={busy} onClick={confirmQuotation}>
                      {busy ? 'Confirming…' : 'Yes, accept'}
                    </button>
                    <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Version history / diff */}
            {versions.length > 0 && (
              <div className="panel mt-4">
                <h2 className="font-bold text-odooink mb-4 flex items-center gap-2">
                  <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
                    <History size={16} />
                  </span>
                  Version history
                  <button className="link-action ml-auto" onClick={() => setShowVersions((v) => !v)}>
                    {showVersions ? 'Hide' : 'View Changes'}
                  </button>
                </h2>
                {prevVersion && latestVersion && (
                  <div className="rounded-lg border border-odoo-100 bg-odoo-50/40 p-3 mb-3 text-sm">
                    <div className="font-semibold text-odooink mb-1">What changed</div>
                    <div className="flex gap-6">
                      <div>
                        Previous total: <span className="font-medium">{formatInr(prevVersion.total)}</span>
                      </div>
                      <div>
                        New total: <span className="font-medium">{formatInr(latestVersion.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {showVersions && (
                  <div className="space-y-2">
                    {versions.map((v, i) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                        <div className="text-sm font-medium text-odooink">Version {i + 1}</div>
                        <div className="text-sm text-gray-500">{formatInr(v.total)}</div>
                        <Badge tone="gray">{quotationStatusLabel(v.stage)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Negotiation activity */}
            <div className="panel mt-4">
              <h2 className="font-bold text-odooink mb-4 flex items-center gap-2">
                <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
                  <Activity size={16} />
                </span>
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
      </AsyncState>
    </div>
  );
}
