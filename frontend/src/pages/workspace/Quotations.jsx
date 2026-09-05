import { useEffect, useState } from 'react';
import { initialQuotations } from './mockData.js';
import { useWorkspace } from './WorkspaceContext.jsx';
import '../admin/admin.css';

const STAGES = ['Draft', 'Sent', 'Approved', 'Rejected'];
const STAGE_PILL = { Draft: 'inactive', Sent: 'medium', Approved: 'active', Rejected: 'high' };

export default function Quotations() {
  const { reloadKey } = useWorkspace();
  const [rows, setRows] = useState(initialQuotations);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setRows(initialQuotations);
  }, [reloadKey]);

  const filtered = rows.filter((r) =>
    `${r.quoteNo} ${r.customer}`.toLowerCase().includes(query.toLowerCase())
  );

  const handleStageChange = (id, stage) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage } : r)));

  return (
    <div>
      <h1>Quotations</h1>
      <p className="ws-subtitle">Track quotes from draft through approval.</p>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search quotations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="admin-btn"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              {
                id: prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1,
                quoteNo: `Q-${1040 + prev.length + 1}`,
                customer: 'New Customer',
                amount: 0,
                stage: 'Draft',
                createdOn: new Date().toISOString().slice(0, 10),
              },
            ])
          }
        >
          + New quotation
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Quote No.</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Stage</th>
              <th>Created on</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.quoteNo}</td>
                <td>{r.customer}</td>
                <td>${r.amount.toLocaleString()}</td>
                <td>
                  <select
                    value={r.stage}
                    onChange={(e) => handleStageChange(r.id, e.target.value)}
                    style={{ border: 'none', background: 'none', fontWeight: 600 }}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <span className={`pill ${STAGE_PILL[r.stage]}`} style={{ marginLeft: '0.5rem' }}>
                    {r.stage}
                  </span>
                </td>
                <td>{r.createdOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
