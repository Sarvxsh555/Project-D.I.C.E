import { useEffect, useState } from 'react';
import { Radio, Send, History, CheckCircle2, XCircle } from 'lucide-react';

const OEEG_BASE = 'http://localhost:8092';

const FIELD_CONFIG = {
  'stock.replenished': [
    { key: 'productId', label: 'Product ID', type: 'number', default: 1 },
    { key: 'warehouseId', label: 'Warehouse ID', type: 'number', default: 1 },
    { key: 'quantity', label: 'Quantity', type: 'number', default: 10 },
  ],
  'account.payment_posted': [
    { key: 'invoiceRef', label: 'Invoice Ref', type: 'text', default: 'INV/DEMO/0001' },
    { key: 'amount', label: 'Amount', type: 'number', default: 0 },
    { key: 'currency', label: 'Currency', type: 'text', default: 'INR' },
  ],
  'stock.picking_done': [
    { key: 'pickingName', label: 'Picking Name', type: 'text', default: 'WH/OUT/0001' },
    { key: 'warehouseId', label: 'Warehouse ID', type: 'number', default: 1 },
  ],
  'sale.order_confirmed': [{ key: 'odooSaleOrderName', label: 'Odoo Sale Order Name', type: 'text', default: 'S00001' }],
};

function defaultsFor(event) {
  const fields = FIELD_CONFIG[event] || [];
  const values = {};
  fields.forEach((f) => (values[f.key] = f.default));
  return values;
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHealth = () => {
    fetch(`${OEEG_BASE}/api/oeeg/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 10000);
    fetch(`${OEEG_BASE}/api/oeeg/scenarios`)
      .then((r) => r.json())
      .then(setScenarios)
      .catch((err) => setError(err.message));
    return () => clearInterval(interval);
  }, []);

  const selectScenario = (s) => {
    setSelected(s);
    setFormValues(defaultsFor(s.id));
    setResult(null);
    setError('');
  };

  const updateField = (key, value) => setFormValues((prev) => ({ ...prev, [key]: value }));

  const send = async () => {
    if (!selected) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${OEEG_BASE}/api/oeeg/scenarios/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'D.I.C.E. webhook rejected the event');
      setResult(data);
      setHistory((prev) => [{ id: Date.now(), event: selected.id, ok: true, at: new Date() }, ...prev].slice(0, 25));
    } catch (err) {
      setError(err.message);
      setHistory((prev) => [{ id: Date.now(), event: selected.id, ok: false, at: new Date() }, ...prev].slice(0, 25));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-9 w-9 rounded-lg bg-odoo-600 text-white flex items-center justify-center font-extrabold shadow-card">
          O
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-odoo-700">OEEG</h1>
      </div>
      <p className="page-subtitle">Odoo Event Emulator Gateway — payload real-time Odoo events into D.I.C.E.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="stat-card">
          <div className="stat-label">Service</div>
          <div className="stat-value text-lg">{health ? health.service : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Live Odoo RPC</div>
          <div className="mt-1">
            <span className={`badge ${health?.liveOdooRpc ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {health ? (health.liveOdooRpc ? 'enabled' : 'disabled') : '—'}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Webhook target</div>
          <div className="text-sm font-semibold text-odooink break-all">{health?.webhook || '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Scenarios available</div>
          <div className="stat-value text-lg">{scenarios.length}</div>
        </div>
      </div>

      <div className="grid gap-5 items-start lg:grid-cols-[320px_1fr_300px]">
        <div className="panel">
          <h2 className="font-bold text-odooink mb-3 flex items-center gap-2">
            <Radio size={17} className="text-odoo-600" />
            Scenarios
          </h2>
          <div className="space-y-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => selectScenario(s)}
                className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                  selected?.id === s.id ? 'border-odoo-500 bg-odoo-50' : 'border-gray-100 hover:border-odoo-200'
                }`}
              >
                <div className="font-semibold text-odooink">{s.id}</div>
                <div className="text-xs text-gray-400 mb-1">{s.odooModel}</div>
                <div className="text-xs text-gray-500">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 className="font-bold text-odooink mb-3">Trigger Event</h2>
          {!selected ? (
            <div className="empty-state">Pick a scenario on the left to build a payload.</div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {(FIELD_CONFIG[selected.id] || []).map((f) => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input
                      type={f.type}
                      className="input"
                      value={formValues[f.key] ?? ''}
                      onChange={(e) =>
                        updateField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
              <button className="btn-primary" disabled={sending} onClick={send}>
                <Send size={16} />
                {sending ? 'Sending...' : 'Send to D.I.C.E.'}
              </button>

              {error && <p className="status-banner-error mt-4">{error}</p>}

              {result && (
                <div className="mt-4">
                  <p className="status-banner-success mb-2">Event posted successfully.</p>
                  <pre className="bg-odooink text-gray-100 text-xs rounded-lg p-4 overflow-x-auto max-h-80">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        <div className="panel">
          <h2 className="font-bold text-odooink mb-3 flex items-center gap-2">
            <History size={17} className="text-odoo-600" />
            Session History
          </h2>
          {history.length === 0 ? (
            <div className="empty-state">No events fired yet.</div>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-sm rounded-lg border border-gray-100 p-2.5">
                  {h.ok ? (
                    <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-600 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-odooink truncate">{h.event}</div>
                    <div className="text-xs text-gray-400">{h.at.toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
