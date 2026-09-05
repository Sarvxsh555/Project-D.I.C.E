import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, RotateCcw } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr, stageLabel } from '../../quotationApi.js';
import Badge from '../../components/Badge.jsx';

export default function ApprovalReview() {
  const { token, role } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [chain, setChain] = useState([]);
  const [audit, setAudit] = useState([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    Promise.all([quotationApi.get(token, id), quotationApi.approvalChain(token, id), quotationApi.audit(token, id)])
      .then(([q, c, a]) => {
        setQuote(q);
        setChain(c);
        setAudit(a);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, [token, id]);

  const act = async (action) => {
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (action === 'approve') await quotationApi.approve(token, id, reason);
      else if (action === 'reject') await quotationApi.reject(token, id, reason);
      else await quotationApi.returnForRevision(token, id, reason);
      setReason('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!quote) return <div className="empty-state">{error || 'Loading...'}</div>;

  const discountPercent = quote.subtotal > 0 ? ((quote.discountTotal / quote.subtotal) * 100).toFixed(1) : 0;
  const pendingStep = chain.find((s) => s.status === 'PENDING');
  const canAct = quote.stage === 'PENDING_APPROVAL';
  const stepRole = (name = '') => (name.toLowerCase().includes('finance') ? 'FINANCE' : 'SALES_MANAGER');
  const canDecide =
    canAct && pendingStep && (role === 'ADMIN' || role === stepRole(pendingStep.name));
  const intelEvents = audit.filter((e) => e.action === 'DICE' || e.action === 'INTELLIGENCE' || e.action === 'AUTO_APPROVE');

  return (
    <div>
      <button className="btn-secondary mb-4" onClick={() => navigate('/admin/approvals')}>
        <ArrowLeft size={15} />
        Back to queue
      </button>

      <h1 className="page-title">Quote #{quote.quoteNo}</h1>
      <p className="page-subtitle">Stage: {stageLabel(quote.stage)}</p>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Customer</div>
          <div className="stat-value">{quote.customerName}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Discount</div>
          <div className="stat-value">{discountPercent}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Amount</div>
          <div className="stat-value">{formatInr(quote.total)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Risk Score</div>
          <div className="stat-value">{Math.round(quote.riskScore)} / 100</div>
        </div>
      </div>

      <div className="panel mt-4">
        <h2 className="font-bold text-odooink mb-3">Approval Chain</h2>
        <div className="space-y-2">
          {chain.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">
                {step.status === 'APPROVED' ? <Check size={15} className="text-green-600" /> : step.status === 'REJECTED' ? <X size={15} className="text-red-600" /> : '●'}
              </span>
              <span className="text-odooink">{step.name}</span>
              <Badge tone={step.status === 'APPROVED' ? 'green' : step.status === 'REJECTED' ? 'red' : 'amber'}>
                {step.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {intelEvents.length > 0 && (
        <div className="panel mt-4">
          <h2 className="font-bold text-odooink mb-3">D.I.C.E.</h2>
          {intelEvents.map((event) => (
            <p key={event.id} className="text-sm text-gray-500 my-1">
              {event.reason}
            </p>
          ))}
        </div>
      )}

      {canDecide && pendingStep && (
        <div className="panel mt-4">
          <h2 className="font-bold text-odooink mb-3">Decision on: {pendingStep.name}</h2>
          {role !== 'ADMIN' && (
            <p className="text-sm text-gray-500 mb-3">You can act on this step because it matches your role.</p>
          )}
          <textarea
            placeholder="Reason (e.g. Hardware discount exceeds ceiling.)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input min-h-[80px] resize-y mb-4"
          />
          <div className="panel-actions mt-0">
            <button className="btn-primary" disabled={busy} onClick={() => act('approve')}>
              <Check size={16} />
              Approve
            </button>
            <button className="btn bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={() => act('reject')}>
              <X size={16} />
              Reject
            </button>
            <button className="btn-secondary" disabled={busy} onClick={() => act('return')}>
              <RotateCcw size={16} />
              Return
            </button>
          </div>
        </div>
      )}

      {canAct && pendingStep && !canDecide && (
        <p className="status-banner-error mt-4">
          Waiting on {pendingStep.name}. Your role cannot clear this step.
        </p>
      )}

      <div className="panel mt-4">
        <h2 className="font-bold text-odooink mb-3">Audit History</h2>
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Who</th>
                <th>What</th>
                <th>When</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((event) => (
                <tr key={event.id}>
                  <td>{event.username}</td>
                  <td>
                    {event.action}
                    {event.fromStage && event.toStage && event.fromStage !== event.toStage
                      ? ` (${stageLabel(event.fromStage)} → ${stageLabel(event.toStage)})`
                      : ''}
                  </td>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td>{event.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
