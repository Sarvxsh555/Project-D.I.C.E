import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr, PIPELINE_STAGES } from '../../quotationApi.js';
import AsyncState from '../../components/AsyncState.jsx';
import Badge from '../../components/Badge.jsx';
import { quotationStatusLabel } from '../../lib/customerStatus.js';

export default function CustomerQuotations() {
  const { token, customerId } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = () => {
    setError('');
    setQuotes(null);
    quotationApi
      .list(token, { customerId, size: 100, sortBy: 'createdAt', direction: 'DESC' })
      .then((data) => setQuotes(data.content))
      .catch((err) => setError(err.message || 'Unable to load your quotations.'));
  };

  useEffect(load, [token, customerId]);

  const filtered = (quotes || []).filter((q) => {
    if (status && q.stage !== status) return false;
    if (search && !q.quoteNo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h1 className="page-title">My Quotations</h1>
      <p className="page-subtitle">Every quote your sales rep has sent you.</p>

      <div className="flex gap-3 mb-4">
        <input
          className="input flex-1 max-w-xs"
          placeholder="Search by quote number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {quotationStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <AsyncState
        loading={quotes === null && !error}
        error={error}
        onRetry={load}
        empty={filtered.length === 0}
        emptyMessage="No quotations yet."
        emptyHint="New quotes from your sales rep will show up here."
      >
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} className="cursor-pointer" onClick={() => navigate(`/customer/quotations/${q.id}`)}>
                  <td className="font-semibold text-odooink">{q.quoteNo}</td>
                  <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td>{formatInr(q.total)}</td>
                  <td>
                    <Badge tone="blue">{quotationStatusLabel(q.stage)}</Badge>
                  </td>
                  <td>{new Date(q.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <button className="link-action" onClick={() => navigate(`/customer/quotations/${q.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </div>
  );
}
