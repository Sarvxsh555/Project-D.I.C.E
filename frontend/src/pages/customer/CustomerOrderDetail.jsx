import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { dealApi, fulfillmentApi } from '../../dealFlowApi.js';
import { formatInr } from '../../quotationApi.js';
import AsyncState from '../../components/AsyncState.jsx';
import Badge from '../../components/Badge.jsx';
import { orderStatusLabel, fulfillmentStageLabel } from '../../lib/customerStatus.js';

const STAGES = ['Order Confirmed', 'Preparing', 'Allocated', 'Processing', 'Completed'];

function fulfillmentStageIndex(order, plan) {
  if (order.status === 'COMPLETED') return 4;
  if (!plan) return 0;
  if (plan.status === 'CONFIRMED') return 2;
  return 1;
}

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    dealApi
      .getOrder(token, id)
      .then((o) => {
        setOrder(o);
        return fulfillmentApi.getByOrder(token, id).catch(() => null);
      })
      .then(setPlan)
      .catch((err) => setError(err.message || 'Unable to load this order.'));
  };

  useEffect(load, [token, id]);

  const stageIdx = order ? fulfillmentStageIndex(order, plan) : 0;

  return (
    <div>
      <button className="link-action mb-3 inline-flex items-center gap-1" onClick={() => navigate('/customer/orders')}>
        <ArrowLeft size={14} /> Back to orders
      </button>

      <AsyncState loading={order === null && !error} error={error} onRetry={load}>
        {order && (
          <>
            <h1 className="page-title">{order.orderNo}</h1>
            <p className="page-subtitle">
              From quotation Q-{order.quotationId} · Status: {orderStatusLabel(order.status)}
            </p>

            <div className="card p-4 mb-6 flex items-center gap-1 overflow-x-auto">
              {STAGES.map((label, i) => (
                <div key={label} className="flex items-center">
                  <div
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                      i === stageIdx ? 'bg-odoo-600 text-white' : i < stageIdx ? 'bg-odoo-50 text-odoo-700' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {label}
                  </div>
                  {i < STAGES.length - 1 && <div className="w-4 h-px bg-gray-200 mx-1" />}
                </div>
              ))}
            </div>

            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.productName}</td>
                      <td>{l.quantity}</td>
                      <td>{formatInr(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-4 mt-4 inline-block">
              <div className="stat-label">Total</div>
              <div className="text-xl font-bold text-odooink">{formatInr(order.total)}</div>
            </div>

            <div className="panel mt-4">
              <h2 className="font-bold text-odooink mb-3">Fulfillment</h2>
              {plan ? (
                <Badge tone="blue">{fulfillmentStageLabel(plan.status)}</Badge>
              ) : (
                <p className="text-sm text-gray-400">Fulfillment has not started yet.</p>
              )}
            </div>
          </>
        )}
      </AsyncState>
    </div>
  );
}
