import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { dealHealthApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import Badge from '../../components/Badge.jsx';

const RISK_TONE = { HEALTHY: 'green', AT_RISK: 'amber', CRITICAL: 'red' };

export default function DealHealthDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    dealHealthApi
      .dashboard(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Deal Health</h1>
          <p className="page-subtitle mb-0">Computed live from approval delay, discount deviation, inventory, negotiation count and margin.</p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {error && <p className="status-banner-error mb-4">{error}</p>}
      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Healthy</div>
              <div className="stat-value">{data.summary.healthy}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">At Risk</div>
              <div className="stat-value">{data.summary.atRisk}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Critical</div>
              <div className="stat-value">{data.summary.critical}</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Quote</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Score</th>
                  <th>Risk</th>
                  <th>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {data.deals.map((d) => (
                  <tr key={d.quotationId}>
                    <td className="font-medium">{d.quoteNo}</td>
                    <td>{d.customerName}</td>
                    <td>{formatInr(d.total)}</td>
                    <td>{d.score}</td>
                    <td>
                      <Badge tone={RISK_TONE[d.risk]}>
                        <span className="inline-flex items-center gap-1">
                          {d.risk !== 'HEALTHY' && <AlertTriangle size={11} />}
                          {d.risk.replace('_', ' ')}
                        </span>
                      </Badge>
                    </td>
                    <td>
                      {d.reasons.length === 0 ? (
                        <span className="text-gray-300">-</span>
                      ) : (
                        <ul className="list-disc pl-4 space-y-0.5">
                          {d.reasons.map((r, i) => (
                            <li key={i} className="text-xs text-gray-500">
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
