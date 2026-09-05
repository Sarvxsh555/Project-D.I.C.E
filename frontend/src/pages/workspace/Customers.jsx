import { useEffect, useState } from 'react';
import { initialCustomers } from './mockData.js';
import { useWorkspace } from './WorkspaceContext.jsx';
import '../admin/admin.css';

export default function Customers() {
  const { reloadKey } = useWorkspace();
  const [rows, setRows] = useState(initialCustomers);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setRows(initialCustomers);
  }, [reloadKey]);

  const filtered = rows.filter((r) => `${r.name} ${r.region}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <h1>Customers</h1>
      <p className="ws-subtitle">Accounts you own, with tier and last order date.</p>

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
              <th>Last order</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.tier}</td>
                <td>{r.email}</td>
                <td>{r.region}</td>
                <td>{r.lastOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
