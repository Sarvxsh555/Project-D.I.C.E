import { useEffect, useState } from 'react';
import { initialDeals, PIPELINE_STAGES } from './mockData.js';
import { useWorkspace } from './WorkspaceContext.jsx';

export default function Pipeline() {
  const { reloadKey } = useWorkspace();
  const [deals, setDeals] = useState(initialDeals);

  useEffect(() => {
    setDeals(initialDeals);
  }, [reloadKey]);

  const handleStageChange = (id, stage) =>
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));

  return (
    <div>
      <h1>Pipeline</h1>
      <p className="ws-subtitle">Deals grouped by stage.</p>

      <div className="pipeline-board">
        {PIPELINE_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const total = stageDeals.reduce((sum, d) => sum + d.amount, 0);
          return (
            <div className="pipeline-col" key={stage}>
              <h3>
                {stage} <span>${total.toLocaleString()}</span>
              </h3>
              {stageDeals.map((deal) => (
                <div className="deal-card" key={deal.id}>
                  <div className="deal-name">{deal.name}</div>
                  <div className="deal-meta">
                    <span>${deal.amount.toLocaleString()}</span>
                  </div>
                  <select value={deal.stage} onChange={(e) => handleStageChange(deal.id, e.target.value)}>
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
