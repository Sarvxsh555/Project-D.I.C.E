import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { adminApi } from '../../api.js';

function BarList({ title, data }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="bar-list">
      <h3>{title}</h3>
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span>{d.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span>
            {d.value}
            {title === 'Discount distribution' ? '%' : ''}
          </span>
        </div>
      ))}
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
      <h1>Analytics</h1>
      <p className="admin-subtitle">Revenue, quotes, orders, approval rate, discount distribution and performance.</p>

      {error && <p className="status error">{error}</p>}
      {!summary && !error && <p className="admin-subtitle">Loading...</p>}

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
