import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <h1>Pipeline</h1>
      <p className="ws-subtitle">
        Drag a card to move it forward. Illegal transitions are rejected by the backend and snap back.
      </p>

      {error && <p className="status error">{error}</p>}

      <div className="pipeline-board">
        {PIPELINE_STAGES.map((stage) => {
          const stageQuotes = quotes.filter((q) => q.stage === stage);
          const total = stageQuotes.reduce((sum, q) => sum + q.total, 0);
          return (
            <div
              className={`pipeline-col ${dragOverStage === stage ? 'drag-over' : ''}`}
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
              <h3>
                {stageLabel(stage)} <span>{formatInr(total)}</span>
              </h3>
              {stageQuotes.map((quote) => (
                <div
                  className={`deal-card ${draggingId === quote.id ? 'dragging' : ''}`}
                  key={quote.id}
                  draggable
                  onDragStart={() => setDraggingId(quote.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => navigate(`/workspace/quotations/${quote.id}`)}
                >
                  <div className="deal-name">{quote.customerName}</div>
                  <div className="deal-meta">
                    <span>{quote.quoteNo}</span>
                    <span>{formatInr(quote.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
