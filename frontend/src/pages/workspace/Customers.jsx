import { useEffect, useState } from 'react';
import { quotationApi } from '../../quotationApi.js';
import { useAuth } from '../../AuthContext.jsx';
import { useWorkspace } from './WorkspaceContext.jsx';
import '../admin/admin.css';

export default function Customers() {
  const { token } = useAuth();
  const { reloadKey } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState('Silver');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await quotationApi.customers(token);
      setRows(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token, reloadKey]);

  const create = async (e) => {
    e.preventDefault();
    await quotationApi.createCustomer(token, { name, tier, email, region });
    setName('');
    setEmail('');
    setRegion('');
    await load();
  };

  const filtered = rows.filter((r) => `${r.name} ${r.region || ''}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <h1>Customers</h1>
      <p className="ws-subtitle">Accounts stored in PostgreSQL via the data service.</p>
      {error && <p className="status error">{error}</p>}

      <form className="admin-toolbar" onSubmit={create} style={{ gap: 8, flexWrap: 'wrap' }}>
        <input required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Region" value={region} onChange={(e) => setRegion(e.target.value)} />
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option>Bronze</option>
          <option>Silver</option>
          <option>Gold</option>
          <option>Platinum</option>
        </select>
        <button type="submit">Add customer</button>
      </form>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search customers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tier</th>
              <th>Email</th>
              <th>Region</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4}>No customers yet.</td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.tier}</td>
                <td>{r.email}</td>
                <td>{r.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
