import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, formatInr } from '../../quotationApi.js';

// What each D.I.C.E. reason code means to a reviewer, and how loudly to say it. The tone
// drives the chip colour so the blocking reason is visible without opening the quote.
const REASON_META = {
  MARGIN_FLOOR: { label: 'Margin below floor', tone: 'red' },
  DEAL_VALUE: { label: 'Above sales authority', tone: 'red' },
  BLENDED_FINANCE: { label: 'Stacked overage', tone: 'red' },
  DISCOUNT_ANOMALY: { label: 'Unusual discount', tone: 'amber' },
  CATEGORY_BLEND: { label: 'Category ceiling', tone: 'amber' },
  SERVICE_LINE_STRICT: { label: 'Service line', tone: 'amber' },
  BLENDED_OVERAGE: { label: 'Stacked overage', tone: 'amber' },
  RISK_THRESHOLD: { label: 'Risk threshold', tone: 'amber' },
  BASELINE_DISCOUNT: { label: 'Discount depth', tone: 'gray' },
  TIER_FAST_TRACK: { label: 'Tier fast-track', tone: 'green' },
  AUTO_APPROVE: { label: 'Auto-approved', tone: 'green' },
  POST_HOC_AUDIT: { label: 'Needs post-hoc audit', tone: 'amber' },
  SKIP_FINANCE: { label: 'Manager only', tone: 'gray' },
};

// Codes that merely explain the score rather than justify the gate - not worth a chip.
const NON_BLOCKING = new Set(['BASELINE_DISCOUNT', 'SKIP_FINANCE', 'AUTO_APPROVE']);

const TONE_CLASS = {
  red: 'bg-red-50 text-red-700 ring-red-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  green: 'bg-green-50 text-green-700 ring-green-100',
  gray: 'bg-gray-100 text-gray-600 ring-gray-200',
};

function ReasonChips({ codes }) {
  if (!codes) return <span className="text-xs text-gray-400">—</span>;
  const shown = codes.filter((c) => !NON_BLOCKING.has(c));
  if (shown.length === 0) return <span className="text-xs text-gray-400">No blocking rule</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((code) => {
        const meta = REASON_META[code] || { label: code, tone: 'gray' };
        return (
          <span
            key={code}
            title={code}
            className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ring-1 ${TONE_CLASS[meta.tone]}`}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

export default function ApprovalQueue() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ content: [] });
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    quotationApi
      .list(token, { status: 'PENDING_APPROVAL', sortBy: 'createdAt', direction: 'ASC', size: 50 })
      .then((page) => {
        setData(page);
        const ids = (page.content || []).map((q) => q.id);
        if (ids.length === 0) return;
        // Best-effort: the queue is still usable if the explanations fail to load.
        quotationApi
          .diceDecisions(token, ids)
          .then(setDecisions)
          .catch(() => setDecisions({}));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Riskiest first - a reviewer working top-down then handles the costliest decisions while
  // they are freshest, instead of whatever happened to be submitted earliest.
  const rows = [...(data.content || [])].sort(
    (a, b) => (decisions[b.id]?.riskScore ?? b.riskScore ?? 0) - (decisions[a.id]?.riskScore ?? a.riskScore ?? 0)
  );

  const openReview = (id) => navigate(`/admin/approvals/${id}`);

  return (
    <div>
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <CheckSquare size={20} />
        </span>
        Approvals
      </h1>
      <p className="page-subtitle">Quotations awaiting sign-off, oldest first.</p>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : data.content.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="font-medium text-gray-500">Nothing waiting on approval.</p>
          <p className="text-xs text-gray-400 mt-0.5">The queue is clear — new quotes will appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>Quote No.</th>
                <th>Customer</th>
                <th>Rep</th>
                <th>Amount</th>
                <th>Discount %</th>
                <th>Risk Score</th>
                <th>Why it's here</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const discountPercent = q.subtotal > 0 ? ((q.discountTotal / q.subtotal) * 100).toFixed(1) : 0;
                const href = `/admin/approvals/${q.id}`;
                const decision = decisions[q.id];
                const risk = Math.round(decision?.riskScore ?? q.riskScore ?? 0);
                return (
                  <tr
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => openReview(q.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openReview(q.id);
                      }
                    }}
                  >
                    <td className="font-medium">
                      <Link
                        to={href}
                        className="text-odoo-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {q.quoteNo}
                      </Link>
                    </td>
                    <td>{q.customerName}</td>
                    <td>{q.repUsername}</td>
                    <td>{formatInr(q.total)}</td>
                    <td>{discountPercent}%</td>
                    <td>
                      <span
                        className={`font-semibold ${
                          risk >= 70 ? 'text-red-600' : risk >= 40 ? 'text-amber-600' : 'text-gray-600'
                        }`}
                      >
                        {risk}
                      </span>
                      <span className="text-gray-400"> / 100</span>
                      {decision?.requiredLevel && decision.requiredLevel !== 'NONE' && (
                        <div className="text-[11px] text-gray-400">
                          {decision.requiredLevel === 'FINANCE' ? 'Manager → Finance' : 'Manager'}
                        </div>
                      )}
                    </td>
                    <td className="max-w-xs">
                      <ReasonChips codes={decision?.reasonCodes} />
                    </td>
                    <td>
                      <Link
                        to={href}
                        className="btn-secondary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
