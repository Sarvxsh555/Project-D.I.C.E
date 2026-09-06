import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Hourglass, Package, Truck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr } from '../../quotationApi.js';
import { dealApi } from '../../dealFlowApi.js';
import AsyncState from '../../components/AsyncState.jsx';
import Badge from '../../components/Badge.jsx';
import { quotationStatusLabel, orderStatusLabel, needsCustomerAction } from '../../lib/customerStatus.js';

export default function CustomerDashboard() {
  const { token, customerId } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState(null);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    setQuotes(null);
    setOrders(null);
    Promise.all([
      quotationApi.list(token, { customerId, size: 50, sortBy: 'createdAt', direction: 'DESC' }),
      dealApi.listMine(token),
    ])
      .then(([quoteData, orderData]) => {
        setQuotes(quoteData.content);
        setOrders(orderData);
      })
      .catch((err) => setError(err.message || 'Unable to load your dashboard.'));
  };

  useEffect(load, [token, customerId]);

  const loading = quotes === null && !error;
  const actionable = (quotes || []).filter(needsCustomerAction);
  const activeQuotes = (quotes || []).filter((q) => !['ORDERED', 'FULFILLMENT', 'COMPLETED'].includes(q.stage));
  const inFulfillment = (orders || []).filter((o) => o.status === 'FULFILLING');
  const completedOrders = (orders || []).filter((o) => o.status === 'COMPLETED');
  const companyName = quotes?.[0]?.customerName || orders?.[0]?.customerName || 'there';

  const cards = [
    { label: 'Active Quotations', value: activeQuotes.length, icon: FileText },
    { label: 'Awaiting Your Response', value: actionable.length, icon: Hourglass },
    { label: 'Orders', value: (orders || []).length, icon: Package },
    { label: 'In Fulfillment', value: inFulfillment.length, icon: Truck },
    { label: 'Completed Orders', value: completedOrders.length, icon: CheckCircle2 },
  ];

  return (
    <div>
      <h1 className="page-title">Welcome back, {companyName}</h1>
      <p className="page-subtitle">
        {actionable.length > 0
          ? `You have ${actionable.length} quotation${actionable.length > 1 ? 's' : ''} that need your attention.`
          : 'You are all caught up.'}
      </p>

      <AsyncState loading={loading} error={error} onRetry={load}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="stat-label">{label}</div>
                <Icon className="text-odoo-400" size={16} />
              </div>
              <div className="text-2xl font-bold text-odooink mt-1">{value}</div>
            </div>
          ))}
        </div>

        {actionable.length > 0 && (
          <div className="panel mb-8">
            <h2 className="font-bold text-odooink mb-3">Action required</h2>
            <div className="space-y-2">
              {actionable.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-3"
                >
                  <div>
                    <div className="font-semibold text-odooink">{q.quoteNo}</div>
                    <div className="text-sm text-gray-500">
                      {formatInr(q.total)} · {quotationStatusLabel(q.stage)}
                    </div>
                  </div>
                  <button className="btn-primary" onClick={() => navigate(`/customer/quotations/${q.id}`)}>
                    {q.stage === 'NEGOTIATION' ? 'View Changes' : 'Review Quotation'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="panel">
            <h2 className="font-bold text-odooink mb-3">Recent quotations</h2>
            {(quotes || []).length === 0 ? (
              <p className="text-sm text-gray-400">No quotations yet.</p>
            ) : (
              <div className="space-y-2">
                {(quotes || []).slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 cursor-pointer hover:border-odoo-200"
                    onClick={() => navigate(`/customer/quotations/${q.id}`)}
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-400">{q.quoteNo}</div>
                      <div className="font-semibold text-odooink">{formatInr(q.total)}</div>
                    </div>
                    <Badge tone="blue">{quotationStatusLabel(q.stage)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2 className="font-bold text-odooink mb-3">Recent orders</h2>
            {(orders || []).length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {(orders || []).slice(0, 5).map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 cursor-pointer hover:border-odoo-200"
                    onClick={() => navigate(`/customer/orders/${o.id}`)}
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-400">{o.orderNo}</div>
                      <div className="font-semibold text-odooink">{formatInr(o.total)}</div>
                    </div>
                    <Badge tone="blue">{orderStatusLabel(o.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AsyncState>
    </div>
  );
}
