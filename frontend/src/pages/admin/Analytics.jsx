import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { adminApi } from '../../api.js';

function BarList({ title, data }) {
  if (!data?.length) {
    return (
      <div className="panel mb-5">
        <h3 className="font-semibold text-odooink mb-3">{title}</h3>
        <p className="page-subtitle mb-0">No data yet.</p>
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="panel mb-5">
      <h3 className="font-semibold text-odooink mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div className="grid grid-cols-[140px_1fr_60px] items-center gap-3 text-sm" key={d.label}>
            <span className="text-gray-600 truncate">{d.label}</span>
            <div className="h-2 rounded-pill bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-pill bg-odoo-600"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="text-right font-medium text-odooink">
              {d.value}
              {title === 'Discount distribution' ? '%' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .analyticsSummary(token)
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <div>
      <h1 className="page-title">Analytics</h1>
      <p className="page-subtitle">Revenue, quotes, orders, approval rate, discount distribution and performance.</p>

      {error && <p className="status-banner-error mb-4">{error}</p>}
      {!summary && !error && <p className="page-subtitle">Loading...</p>}

      {summary && (
        <>
          <div className="stat-grid">
            {summary.stats.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          <BarList title="Discount distribution" data={summary.discountDistribution} />
          <BarList title="Product performance" data={summary.productPerformance} />
          <BarList title="Sales performance" data={summary.salesPerformance} />
        </>
      )}
    </div>
  );
}
