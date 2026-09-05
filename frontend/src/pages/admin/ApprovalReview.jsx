import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr, stageLabel } from '../../quotationApi.js';
import './admin.css';

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

  if (!quote) return <div className="admin-empty">{error || 'Loading...'}</div>;

  const discountPercent = quote.subtotal > 0 ? ((quote.discountTotal / quote.subtotal) * 100).toFixed(1) : 0;
  const pendingStep = chain.find((s) => s.status === 'PENDING');
  const canAct = quote.stage === 'PENDING_APPROVAL';
  const stepRole = (name = '') => (name.toLowerCase().includes('finance') ? 'FINANCE' : 'SALES_MANAGER');
  const canDecide =
    canAct && pendingStep && (role === 'ADMIN' || role === stepRole(pendingStep.name));
  const intelEvents = audit.filter((e) => e.action === 'DICE' || e.action === 'INTELLIGENCE' || e.action === 'AUTO_APPROVE');

  return (
    <div>
      <button className="admin-btn secondary" onClick={() => navigate('/admin/approvals')} style={{ marginBottom: '1rem' }}>
        Back to queue
      </button>

      <h1>QUOTE #{quote.quoteNo}</h1>
      <p className="admin-subtitle">Stage: {stageLabel(quote.stage)}</p>

      {error && <p className="status error">{error}</p>}

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

      <div className="builder-panel" style={{ marginTop: '1rem' }}>
        <h2>Approval Chain</h2>
        {chain.map((step) => (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0' }}>
            <span>
              {step.status === 'APPROVED' ? '✓' : step.status === 'REJECTED' ? '✕' : '●'}
            </span>
            <span>{step.name}</span>
            <span className={`pill ${step.status === 'APPROVED' ? 'active' : step.status === 'REJECTED' ? 'high' : 'medium'}`}>
              {step.status}
            </span>
          </div>
        ))}
      </div>

      {intelEvents.length > 0 && (
        <div className="builder-panel" style={{ marginTop: '1rem' }}>
          <h2>D.I.C.E.</h2>
          {intelEvents.map((event) => (
            <p key={event.id} className="ws-subtitle" style={{ margin: '0.25rem 0' }}>
              {event.reason}
            </p>
          ))}
        </div>
      )}

      {canDecide && pendingStep && (
        <div className="builder-panel" style={{ marginTop: '1rem' }}>
          <h2>Decision on: {pendingStep.name}</h2>
          {role !== 'ADMIN' && (
            <p className="ws-subtitle">You can act on this step because it matches your role.</p>
          )}
          <textarea
            placeholder="Reason (e.g. Hardware discount exceeds ceiling.)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: '100%', minHeight: '70px', marginBottom: '0.75rem' }}
          />
          <div className="builder-actions">
            <button className="admin-btn" disabled={busy} onClick={() => act('approve')}>
              APPROVE
            </button>
            <button className="admin-btn danger" disabled={busy} onClick={() => act('reject')}>
              REJECT
            </button>
            <button className="admin-btn secondary" disabled={busy} onClick={() => act('return')}>
              RETURN
            </button>
          </div>
        </div>
      )}

      {canAct && pendingStep && !canDecide && (
        <p className="status error" style={{ marginTop: '1rem' }}>
          Waiting on {pendingStep.name}. Your role cannot clear this step.
        </p>
      )}

      <div className="builder-panel" style={{ marginTop: '1rem' }}>
        <h2>Audit History</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
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
