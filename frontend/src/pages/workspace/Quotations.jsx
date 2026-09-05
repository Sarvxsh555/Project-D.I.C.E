import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, SearchX } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, PIPELINE_STAGES, stageLabel, formatInr } from '../../quotationApi.js';
import { useWorkspace } from './WorkspaceContext.jsx';
import Badge from '../../components/Badge.jsx';

const STAGE_TONE = {
  DRAFT: 'gray',
  PENDING_APPROVAL: 'amber',
  NEGOTIATION: 'amber',
  APPROVED: 'green',
  ORDERED: 'green',
  FULFILLMENT: 'green',
  COMPLETED: 'green',
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
      <div className="toolbar">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
              <FileText size={20} />
            </span>
            Quotations
          </h1>
          <p className="page-subtitle mb-0">Track quotes from draft through approval.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/workspace/quotations/new')}>
          <Plus size={16} />
          New quotation
        </button>
      </div>

      <div className="panel mb-5">
        <div className="flex flex-wrap gap-3">
          <input
            className="input max-w-xs"
            placeholder="Search quote no. or customer..."
            value={q}
            onChange={(e) => resetToFirstPage(setQ)(e.target.value)}
          />
          <select className="input w-auto" value={status} onChange={(e) => resetToFirstPage(setStatus)(e.target.value)}>
            <option value="">All statuses</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {stageLabel(s)}
              </option>
            ))}
          </select>
          <select className="input w-auto" value={customerId} onChange={(e) => resetToFirstPage(setCustomerId)(e.target.value)}>
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="input w-36"
            placeholder="Rep username"
            value={rep}
            onChange={(e) => resetToFirstPage(setRep)(e.target.value)}
          />
          <input className="input w-auto" type="date" value={from} onChange={(e) => resetToFirstPage(setFrom)(e.target.value)} />
          <input className="input w-auto" type="date" value={to} onChange={(e) => resetToFirstPage(setTo)(e.target.value)} />
          <input
            className="input w-28"
            type="number"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => resetToFirstPage(setMinAmount)(e.target.value)}
          />
          <input
            className="input w-28"
            type="number"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => resetToFirstPage(setMaxAmount)(e.target.value)}
          />
          <select
            className="input w-auto"
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
      </div>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : data.content.length === 0 ? (
        <div className="empty-state">
          <SearchX className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="font-medium text-gray-500">No quotations match these filters.</p>
          <p className="text-xs text-gray-400 mt-0.5">Try widening your search or clearing a filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.content.map((quote) => (
            <div
              key={quote.id}
              className="card p-5 cursor-pointer hover:border-odoo-300 transition-colors"
              onClick={() => navigate(`/workspace/quotations/${quote.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">{quote.quoteNo}</span>
                <Badge tone={STAGE_TONE[quote.stage]}>{stageLabel(quote.stage)}</Badge>
              </div>
              <h3 className="font-bold text-odooink mb-1">{quote.customerName}</h3>
              <div className="text-xl font-extrabold text-odooink mb-2">{formatInr(quote.total)}</div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{quote.repUsername}</span>
                <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button className="btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {data.totalPages}
          </span>
          <button
            className="btn-secondary"
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
