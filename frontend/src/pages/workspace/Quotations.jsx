import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, PIPELINE_STAGES, stageLabel, formatInr } from '../../quotationApi.js';
import { useWorkspace } from './WorkspaceContext.jsx';
import '../admin/admin.css';

const STAGE_PILL = {
  DRAFT: 'inactive',
  PENDING_APPROVAL: 'medium',
  NEGOTIATION: 'medium',
  APPROVED: 'active',
  ORDERED: 'active',
  FULFILLMENT: 'active',
  COMPLETED: 'active',
};

const PAGE_SIZE = 9;

export default function Quotations() {
  const { token } = useAuth();
  const { reloadKey } = useWorkspace();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [rep, setRep] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [direction, setDirection] = useState('DESC');
  const [page, setPage] = useState(0);

  useEffect(() => {
    quotationApi.customers(token).then(setCustomers).catch(() => {});
  }, [token, reloadKey]);

  useEffect(() => {
    setLoading(true);
    setError('');
    quotationApi
      .list(token, {
        status: status || undefined,
        customerId: customerId || undefined,
        rep: rep || undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        q: q || undefined,
        sortBy,
        direction,
        page,
        size: PAGE_SIZE,
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, reloadKey, status, customerId, rep, minAmount, maxAmount, from, to, q, sortBy, direction, page]);

  const resetToFirstPage = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  return (
    <div>
      <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Quotations</h1>
          <p className="ws-subtitle">Track quotes from draft through approval.</p>
        </div>
        <button className="admin-btn" onClick={() => navigate('/workspace/quotations/new')}>
          + New quotation
        </button>
      </div>

      <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <input
          className="admin-search"
          placeholder="Search quote no. or customer..."
          value={q}
          onChange={(e) => resetToFirstPage(setQ)(e.target.value)}
        />
        <select value={status} onChange={(e) => resetToFirstPage(setStatus)(e.target.value)}>
          <option value="">All statuses</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {stageLabel(s)}
            </option>
          ))}
        </select>
        <select value={customerId} onChange={(e) => resetToFirstPage(setCustomerId)(e.target.value)}>
          <option value="">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Rep username"
          value={rep}
          onChange={(e) => resetToFirstPage(setRep)(e.target.value)}
          style={{ width: '140px' }}
        />
        <input type="date" value={from} onChange={(e) => resetToFirstPage(setFrom)(e.target.value)} />
        <input type="date" value={to} onChange={(e) => resetToFirstPage(setTo)(e.target.value)} />
        <input
          type="number"
          placeholder="Min amount"
          value={minAmount}
          onChange={(e) => resetToFirstPage(setMinAmount)(e.target.value)}
          style={{ width: '110px' }}
        />
        <input
          type="number"
          placeholder="Max amount"
          value={maxAmount}
          onChange={(e) => resetToFirstPage(setMaxAmount)(e.target.value)}
          style={{ width: '110px' }}
        />
        <select
          value={`${sortBy}:${direction}`}
          onChange={(e) => {
            const [sb, dir] = e.target.value.split(':');
            setSortBy(sb);
            setDirection(dir);
            setPage(0);
          }}
        >
          <option value="createdAt:DESC">Newest first</option>
          <option value="createdAt:ASC">Oldest first</option>
          <option value="total:DESC">Amount: high to low</option>
          <option value="total:ASC">Amount: low to high</option>
        </select>
      </div>

      {error && <p className="status error">{error}</p>}

      {loading ? (
        <div className="admin-empty">Loading...</div>
      ) : data.content.length === 0 ? (
        <div className="admin-empty">No quotations match these filters.</div>
      ) : (
        <div className="quote-card-grid">
          {data.content.map((quote) => (
            <div
              key={quote.id}
              className="quote-card"
              onClick={() => navigate(`/workspace/quotations/${quote.id}`)}
            >
              <div className="quote-card-top">
                <span className="quote-no">{quote.quoteNo}</span>
                <span className={`pill ${STAGE_PILL[quote.stage]}`}>{stageLabel(quote.stage)}</span>
              </div>
              <h3>{quote.customerName}</h3>
              <div className="quote-amount">{formatInr(quote.total)}</div>
              <div className="quote-card-meta">
                <span>{quote.repUsername}</span>
                <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="admin-toolbar" style={{ justifyContent: 'center', gap: '1rem' }}>
          <button className="admin-btn secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {data.totalPages}
          </span>
          <button
            className="admin-btn secondary"
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
