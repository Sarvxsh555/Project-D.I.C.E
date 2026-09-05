import { useEffect, useState } from 'react';
import { KeyRound, UserPlus, X } from 'lucide-react';
import { quotationApi } from '../../quotationApi.js';
import { adminApi } from '../../api.js';
import { useAuth } from '../../AuthContext.jsx';
import Badge from '../../components/Badge.jsx';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function Customers() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [tier, setTier] = useState('Silver');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const [customerRows, userRows] = await Promise.all([
        quotationApi.customers(token),
        adminApi.users.list(token),
      ]);
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
      setUsers(Array.isArray(userRows) ? userRows : []);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const userForCustomer = (customerId) => users.find((u) => u.customerId === customerId);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const customer = await quotationApi.createCustomer(token, { name, tier, email, region });
      const username = `${slugify(name)}-${customer.id}`;
      const created = await adminApi.users.create(token, {
        username,
        email: customer.email || email,
        role: 'CUSTOMER',
        customerId: customer.id,
      });
      setCredentials({ username: created.username, password: created.generatedPassword });
      setName('');
      setEmail('');
      setRegion('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const provisionLogin = async (customer) => {
    setError('');
    setBusyId(customer.id);
    try {
      const username = `${slugify(customer.name)}-${customer.id}`;
      const created = await adminApi.users.create(token, {
        username,
        email: customer.email,
        role: 'CUSTOMER',
        customerId: customer.id,
      });
      setCredentials({ username: created.username, password: created.generatedPassword });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (user) => {
    setError('');
    setBusyId(user.id);
    try {
      const result = await adminApi.users.resetPassword(token, user.id);
      setCredentials({ username: result.username, password: result.generatedPassword });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Customers</h1>
      <p className="page-subtitle">Customers are created here only. Each one gets a CUSTOMER-role login automatically.</p>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      {credentials && (
        <div className="rounded-xl border border-odoo-200 bg-odoo-50 p-4 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-odoo-700 mb-2">Login created — shown once, copy it now</p>
              <p className="text-sm text-odooink">
                Username: <code className="bg-white rounded px-1.5 py-0.5">{credentials.username}</code>
              </p>
              <p className="text-sm text-odooink mt-1">
                Password: <code className="bg-white rounded px-1.5 py-0.5">{credentials.password}</code>
              </p>
            </div>
            <button type="button" className="text-gray-400 hover:text-odooink" onClick={() => setCredentials(null)}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="panel mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input required className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input required className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Region" value={region} onChange={(e) => setRegion(e.target.value)} />
          <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option>Bronze</option>
            <option>Silver</option>
            <option>Gold</option>
            <option>Platinum</option>
          </select>
        </div>
        <button type="submit" className="btn-primary mt-4">
          <UserPlus size={16} />
          Add customer + create login
        </button>
      </form>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tier</th>
              <th>Email</th>
              <th>Region</th>
              <th>Login Username</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">No customers yet.</td>
              </tr>
            )}
            {customers.map((c) => {
              const user = userForCustomer(c.id);
              return (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>
                    <Badge tone="blue">{c.tier}</Badge>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.region}</td>
                  <td>{user ? user.username : <em className="text-gray-400">no login</em>}</td>
                  <td>
                    {user ? (
                      <button type="button" className="link-action" disabled={busyId === user.id} onClick={() => resetPassword(user)}>
                        <span className="inline-flex items-center gap-1">
                          <KeyRound size={14} />
                          Reset password
                        </span>
                      </button>
                    ) : (
                      <button type="button" className="link-action" disabled={busyId === c.id} onClick={() => provisionLogin(c)}>
                        Create login
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
