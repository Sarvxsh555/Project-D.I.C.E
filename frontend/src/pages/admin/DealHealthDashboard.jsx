import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { dealHealthApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import './admin.css';

const RISK_PILL = { HEALTHY: 'active', AT_RISK: 'medium', CRITICAL: 'high' };
const RISK_ICON = { HEALTHY: '', AT_RISK: '⚠ ', CRITICAL: '⚠ ' };

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
      <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Deal Health</h1>
          <p className="admin-subtitle">Computed live from approval delay, discount deviation, inventory, negotiation count and margin.</p>
        </div>
        <button className="admin-btn secondary" onClick={load}>Refresh</button>
      </div>

      {error && <p className="status error">{error}</p>}
      {loading ? (
        <div className="admin-empty">Loading...</div>
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

          <div className="admin-table-wrap" style={{ marginTop: '1rem' }}>
            <table className="admin-table">
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
                    <td>{d.quoteNo}</td>
                    <td>{d.customerName}</td>
                    <td>{formatInr(d.total)}</td>
                    <td>{d.score}</td>
                    <td>
                      <span className={`pill ${RISK_PILL[d.risk]}`}>
                        {RISK_ICON[d.risk]}
                        {d.risk.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {d.reasons.length === 0 ? (
                        <span style={{ color: '#9aa1b1' }}>-</span>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                          {d.reasons.map((r, i) => (
                            <li key={i} style={{ fontSize: '0.8rem' }}>{r}</li>
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
