import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr } from '../../quotationApi.js';
import './admin.css';

export default function ApprovalQueue() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ content: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    quotationApi
      .list(token, { status: 'PENDING_APPROVAL', sortBy: 'createdAt', direction: 'ASC', size: 50 })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1>Approvals</h1>
      <p className="admin-subtitle">Quotations awaiting sign-off, oldest first.</p>

      {error && <p className="status error">{error}</p>}

      {loading ? (
        <div className="admin-empty">Loading...</div>
      ) : data.content.length === 0 ? (
        <div className="admin-empty">Nothing waiting on approval.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Quote No.</th>
                <th>Customer</th>
                <th>Rep</th>
                <th>Amount</th>
                <th>Discount %</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((q) => {
                const discountPercent = q.subtotal > 0 ? ((q.discountTotal / q.subtotal) * 100).toFixed(1) : 0;
                return (
                  <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/approvals/${q.id}`)}>
                    <td>{q.quoteNo}</td>
                    <td>{q.customerName}</td>
                    <td>{q.repUsername}</td>
                    <td>{formatInr(q.total)}</td>
                    <td>{discountPercent}%</td>
                    <td>{Math.round(q.riskScore)} / 100</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
