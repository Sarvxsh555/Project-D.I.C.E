import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { dealApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import AsyncState from '../../components/AsyncState.jsx';
import Badge from '../../components/Badge.jsx';
import { orderStatusLabel } from '../../lib/customerStatus.js';

export default function CustomerOrders() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    setOrders(null);
    dealApi
      .listMine(token)
      .then(setOrders)
      .catch((err) => setError(err.message || 'Unable to load your orders.'));
  };

  useEffect(load, [token]);

  return (
    <div>
      <h1 className="page-title">My Orders</h1>
      <p className="page-subtitle">Orders placed from your accepted quotations.</p>

      <AsyncState
        loading={orders === null && !error}
        error={error}
        onRetry={load}
        empty={(orders || []).length === 0}
        emptyMessage="No active orders."
        emptyHint="Orders appear here once you accept a quotation."
      >
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Quotation</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).map((o) => (
                <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/customer/orders/${o.id}`)}>
                  <td className="font-semibold text-odooink">{o.orderNo}</td>
                  <td>Q-{o.quotationId}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>{formatInr(o.total)}</td>
                  <td>
                    <Badge tone="blue">{orderStatusLabel(o.status)}</Badge>
                  </td>
                  <td>
                    <button className="link-action" onClick={() => navigate(`/customer/orders/${o.id}`)}>
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
