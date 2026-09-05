import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Kanban } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, PIPELINE_STAGES, stageLabel, formatInr } from '../../quotationApi.js';
import { useWorkspace } from './WorkspaceContext.jsx';

export default function Pipeline() {
  const { token } = useAuth();
  const { reloadKey } = useWorkspace();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState([]);
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const loadAll = () => {
    quotationApi
      .list(token, { size: 200, sortBy: 'createdAt', direction: 'DESC' })
      .then((data) => setQuotes(data.content))
      .catch((err) => setError(err.message));
  };

  useEffect(loadAll, [token, reloadKey]);

  const handleDrop = async (targetStage) => {
    setDragOverStage(null);
    const quote = quotes.find((q) => q.id === draggingId);
    setDraggingId(null);
    if (!quote || quote.stage === targetStage) return;

    // Optimistic move - the backend is still the source of truth and can reject this.
    const previous = quotes;
    setQuotes((prev) => prev.map((q) => (q.id === quote.id ? { ...q, stage: targetStage } : q)));
    setError('');

    try {
      const updated = await quotationApi.transition(token, quote.id, targetStage);
      setQuotes((prev) => prev.map((q) => (q.id === quote.id ? updated : q)));
    } catch (err) {
      setQuotes(previous);
      setError(`${quote.quoteNo}: ${err.message}`);
    }
  };

  return (
    <div>
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <Kanban size={20} />
        </span>
        Pipeline
      </h1>
      <p className="page-subtitle">
        Drag a card to move it forward. Illegal transitions are rejected by the backend and snap back.
      </p>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-4 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage) => {
          const stageQuotes = quotes.filter((q) => q.stage === stage);
          const total = stageQuotes.reduce((sum, q) => sum + q.total, 0);
          return (
            <div
              className={`rounded-xl p-3 min-w-[230px] transition-shadow ${
                dragOverStage === stage ? 'bg-odoo-50 ring-2 ring-odoo-400 ring-inset' : 'bg-gray-100'
              }`}
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage);
              }}
            >
              <h3 className="flex justify-between text-sm font-semibold text-odooink mb-3">
                {stageLabel(stage)} <span className="text-gray-400 font-medium">{formatInr(total)}</span>
              </h3>
              <div className="space-y-2">
                {stageQuotes.map((quote) => (
                  <div
                    className={`card p-3 cursor-grab transition-opacity ${draggingId === quote.id ? 'opacity-40' : ''}`}
                    key={quote.id}
                    draggable
                    onDragStart={() => setDraggingId(quote.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => navigate(`/workspace/quotations/${quote.id}`)}
                  >
                    <div className="font-semibold text-sm text-odooink mb-0.5">{quote.customerName}</div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{quote.quoteNo}</span>
                      <span>{formatInr(quote.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
