import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';

function emptyRecord(fields) {
  const rec = {};
  fields.forEach((f) => {
    rec[f.key] = f.type === 'boolean' ? false : '';
  });
  return rec;
}

function RecordForm({ title, fields, initial, onCancel, onSave }) {
  const [values, setValues] = useState(initial);

  const update = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-odooink/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-7 shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-odooink mb-5">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key} className="label">
                  {f.label}
                </label>
                {f.type === 'select' ? (
                  <select
                    id={f.key}
                    className="input"
                    value={values[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    required={f.required}
                  >
                    <option value="" disabled>
                      Select {f.label.toLowerCase()}
                    </option>
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    id={f.key}
                    className="input min-h-[80px] resize-y"
                    value={values[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    required={f.required}
                  />
                ) : f.type === 'boolean' ? (
                  <select
                    id={f.key}
                    className="input"
                    value={values[f.key] ? 'true' : 'false'}
                    onChange={(e) => update(f.key, e.target.value === 'true')}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                ) : (
                  <input
                    id={f.key}
                    type={f.type || 'text'}
                    className="input"
                    value={values[f.key]}
                    onChange={(e) =>
                      update(f.key, f.type === 'number' ? e.target.valueAsNumber || 0 : e.target.value)
                    }
                    required={f.required}
                    step={f.type === 'number' ? 'any' : undefined}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderCell(field, row) {
  const value = row[field.key];
  if (field.render) return field.render(value, row);
  return value;
}

export default function CrudTable({
  title,
  subtitle,
  entityLabel,
  fields,
  resource,
  searchKeys,
  archivable = false,
  idKey = 'id',
}) {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | record
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resource
      .list(token)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resource, token]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      (searchKeys || fields.map((f) => f.key)).some((key) =>
        String(row[key] ?? '').toLowerCase().includes(q)
      )
    );
  }, [rows, query, fields, searchKeys]);

  const handleSave = async (values) => {
    try {
      if (editing === 'new') {
        const created = await resource.create(token, { ...values, status: values.status || 'active' });
        setRows((prev) => [...prev, created]);
      } else {
        const updated = await resource.update(token, editing[idKey], { ...editing, ...values });
        setRows((prev) => prev.map((r) => (r[idKey] === editing[idKey] ? updated : r)));
      }
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (row) => {
    try {
      await resource.remove(token, row[idKey]);
      setRows((prev) => prev.filter((r) => r[idKey] !== row[idKey]));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleArchiveToggle = async (row) => {
    const nextStatus = row.status === 'archived' ? 'active' : 'archived';
    try {
      const updated = await resource.update(token, row[idKey], { ...row, status: nextStatus });
      setRows((prev) => prev.map((r) => (r[idKey] === row[idKey] ? updated : r)));
    } catch (err) {
      setError(err.message);
    }
  };

  const label = entityLabel || title?.slice(0, -1) || 'record';

  return (
    <div>
      {title && <h1 className="page-title">{title}</h1>}
      {subtitle && <p className="page-subtitle">{subtitle}</p>}

      <div className="toolbar">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 max-w-xs"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus size={16} />
          Add new
        </button>
      </div>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      <div className="table-wrap">
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">No records found.</div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row[idKey]}>
                  {fields.map((f) => (
                    <td key={f.key}>{renderCell(f, row)}</td>
                  ))}
                  <td>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-gray-400 hover:text-odoo-600"
                        title="Edit"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil size={16} />
                      </button>
                      {archivable && (
                        <button
                          className="text-gray-400 hover:text-odoo-600"
                          title={row.status === 'archived' ? 'Unarchive' : 'Archive'}
                          onClick={() => handleArchiveToggle(row)}
                        >
                          {row.status === 'archived' ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                        </button>
                      )}
                      <button
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <RecordForm
          title={editing === 'new' ? `Add ${label}` : `Edit ${label}`}
          fields={fields}
          initial={editing === 'new' ? emptyRecord(fields) : editing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
