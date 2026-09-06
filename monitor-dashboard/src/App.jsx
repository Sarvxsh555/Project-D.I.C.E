import { useEffect, useRef, useState } from 'react';
import { Activity, Terminal, ChevronDown } from 'lucide-react';

const MONITOR_BASE = 'http://localhost:8094';

function relativeTime(date) {
  const secs = Math.round((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  return `${Math.round(secs / 60)}m ago`;
}

function ServiceCard({ svc }) {
  const up = svc.status === 'up';
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-odooink text-sm">{svc.name}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${up ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      </div>
      <div className="text-xs text-gray-400">port {svc.port}</div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={up ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {up ? 'up' : 'down'}
        </span>
        {up && <span className="text-gray-400">{svc.latencyMs}ms</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [services, setServices] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [logLines, setLogLines] = useState([]);
  const logPanelRef = useRef(null);
  const eventSourceRef = useRef(null);

  const loadServices = () => {
    fetch(`${MONITOR_BASE}/api/monitor/services`)
      .then((r) => r.json())
      .then((data) => {
        setServices(data);
        setLastChecked(new Date());
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadServices();
    const interval = setInterval(loadServices, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    setLogLines([]);

    fetch(`${MONITOR_BASE}/api/monitor/logs/${selectedService}?lines=300`)
      .then((r) => r.json())
      .then((data) => setLogLines(data.lines || []));

    const es = new EventSource(`${MONITOR_BASE}/api/monitor/logs/${selectedService}/stream`);
    eventSourceRef.current = es;
    es.onmessage = (e) => {
      try {
        const { line } = JSON.parse(e.data);
        setLogLines((prev) => [...prev, line].slice(-2000));
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [selectedService]);

  useEffect(() => {
    const el = logPanelRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logLines]);

  const sorted = [...services].sort((a, b) => (a.status === b.status ? 0 : a.status === 'down' ? -1 : 1));

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-9 w-9 rounded-lg bg-odoo-600 text-white flex items-center justify-center font-extrabold shadow-card">
          D
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-odoo-700">D.I.C.E. Ops</h1>
      </div>
      <p className="page-subtitle">
        Live health and logs across every service.
        {lastChecked && <span className="text-gray-400"> Last checked {relativeTime(lastChecked)}.</span>}
      </p>

      <div className="panel mb-6">
        <h2 className="font-bold text-odooink mb-4 flex items-center gap-2">
          <Activity size={17} className="text-odoo-600" />
          Service Health
        </h2>
        {sorted.length === 0 ? (
          <div className="empty-state">Checking services...</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
            {sorted.map((svc) => (
              <ServiceCard key={svc.name} svc={svc} />
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="font-bold text-odooink mb-4 flex items-center gap-2">
          <Terminal size={17} className="text-odoo-600" />
          Live Logs
        </h2>
        <div className="relative mb-4 max-w-xs">
          <select
            className="input appearance-none pr-8"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
          >
            <option value="">Select a service...</option>
            {services.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {!selectedService ? (
          <div className="empty-state">Pick a service above to stream its logs live.</div>
        ) : (
          <pre
            ref={logPanelRef}
            className="bg-[#1a1a2e] text-gray-100 text-xs font-mono rounded-lg p-4 h-[420px] overflow-y-auto whitespace-pre-wrap"
          >
            {logLines.length === 0 ? 'Waiting for log output...' : logLines.join('\n')}
          </pre>
        )}
      </div>
    </div>
  );
}
