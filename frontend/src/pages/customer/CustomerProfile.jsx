import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi } from '../../quotationApi.js';
import AsyncState from '../../components/AsyncState.jsx';

export default function CustomerProfile() {
  const { token, customerId } = useAuth();
  const [customerName, setCustomerName] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    quotationApi
      .list(token, { customerId, size: 1 })
      .then((data) => setCustomerName(data.content[0]?.customerName || ''))
      .catch((err) => setError(err.message || 'Unable to load your profile.'));
  };

  useEffect(load, [token, customerId]);

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Your account information.</p>

      <AsyncState loading={customerName === null && !error} error={error} onRetry={load}>
        <div className="card p-6 max-w-md space-y-4">
          <div>
            <div className="stat-label">Company</div>
            <div className="font-semibold text-odooink">{customerName || '—'}</div>
          </div>
          <div>
            <div className="stat-label">Account ID</div>
            <div className="font-semibold text-odooink">{customerId}</div>
          </div>
        </div>
      </AsyncState>
    </div>
  );
}
