import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr } from '../../quotationApi.js';

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
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <CheckSquare size={20} />
        </span>
        Approvals
      </h1>
      <p className="page-subtitle">Quotations awaiting sign-off, oldest first.</p>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : data.content.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="font-medium text-gray-500">Nothing waiting on approval.</p>
          <p className="text-xs text-gray-400 mt-0.5">The queue is clear — new quotes will appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
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
                  <tr
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/approvals/${q.id}`)}
                  >
                    <td className="font-medium">{q.quoteNo}</td>
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
