import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { quotationApi } from '../../quotationApi.js';
import { useAuth } from '../../AuthContext.jsx';
import { useWorkspace } from './WorkspaceContext.jsx';
import Badge from '../../components/Badge.jsx';

export default function Customers() {
  const { token } = useAuth();
  const { reloadKey } = useWorkspace();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
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

  const filtered = rows.filter((r) => `${r.name} ${r.region || ''}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <Users size={20} />
        </span>
        Customers
      </h1>
      <p className="page-subtitle">Customers are managed by Admin. Contact an admin to add a new account.</p>
      {error && <p className="status-banner-error mb-4">{error}</p>}

      <div className="toolbar">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 max-w-xs"
            placeholder="Search customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table-base">
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
                <td colSpan={4} className="empty-state">
                  <Users className="mx-auto text-gray-300 mb-2" size={36} />
                  <p className="font-medium text-gray-500">No customers yet.</p>
                  <p className="text-xs text-gray-400 mt-0.5">Ask an admin to add one.</p>
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>
                  <Badge tone="blue">{r.tier}</Badge>
                </td>
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
