import { useEffect, useMemo, useState } from 'react';
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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          {fields.map((f) => (
            <div className="form-field" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              {f.type === 'select' ? (
                <select
                  id={f.key}
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
                  value={values[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  required={f.required}
                />
              ) : f.type === 'boolean' ? (
                <select
                  id={f.key}
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
          <div className="form-actions">
            <button type="button" className="admin-btn secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="admin-btn">
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
      {title && <h1>{title}</h1>}
      {subtitle && <p className="admin-subtitle">{subtitle}</p>}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="admin-btn" onClick={() => setEditing('new')}>
          + Add new
        </button>
      </div>

      {error && <p className="status error">{error}</p>}

      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">No records found.</div>
        ) : (
          <table className="admin-table">
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
                    <div className="row-actions">
                      <button onClick={() => setEditing(row)}>Edit</button>
                      {archivable && (
                        <button onClick={() => handleArchiveToggle(row)}>
                          {row.status === 'archived' ? 'Unarchive' : 'Archive'}
                        </button>
                      )}
                      <button className="danger" onClick={() => handleDelete(row)}>
                        Delete
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
