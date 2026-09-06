import { useEffect, useState } from 'react';
import { FileDown, FileBarChart } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { adminApi } from '../../api.js';
import { quotationApi, formatInr, stageLabel, PIPELINE_STAGES } from '../../quotationApi.js';
import { dealApi, billingApi } from '../../dealFlowApi.js';
import { downloadReportPdf } from '../../lib/pdfReport.js';

function StatGrid({ stats }) {
  return (
    <div className="stat-grid">
      {stats.map((s) => (
        <div className="stat-card" key={s.label}>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value text-lg">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function TablePanel({ title, columns, rows }) {
  return (
    <div className="panel mt-4">
      <h3 className="font-semibold text-odooink mb-3">{title}</h3>
      {rows.length === 0 ? (
        <div className="empty-state py-4">No data.</div>
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function avg(nums) {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

// ---- ADMIN: platform-wide business overview ----
function useAdminReport(token) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([adminApi.analyticsSummary(token), quotationApi.list(token, { size: 500 }), dealApi.listMine(token)])
      .then(([summary, quotePage, orders]) => {
        const quotes = quotePage.content;
        const byStage = PIPELINE_STAGES.map((stage) => ({
          stage,
          count: quotes.filter((q) => q.stage === stage).length,
        }));
        const totalOrderValue = orders.reduce((s, o) => s + o.total, 0);
        setData({ summary, quotes, byStage, orders, totalOrderValue });
      })
      .catch((err) => setError(err.message));
  }, [token]);

  return { data, error };
}

function AdminReport({ token, username }) {
  const { data, error } = useAdminReport(token);
  if (error) return <p className="status-banner-error">{error}</p>;
  if (!data) return <p className="page-subtitle">Loading report...</p>;

  const stats = [
    ...data.summary.stats,
    { label: 'Total quotations', value: String(data.quotes.length) },
    { label: 'Confirmed order value', value: formatInr(data.totalOrderValue) },
  ];

  const download = () =>
    downloadReportPdf({
      title: 'Business Overview Report',
      subtitle: 'Platform-wide catalog, pipeline and order snapshot',
      generatedFor: `${username} (Admin)`,
      filename: `dice-admin-report-${Date.now()}.pdf`,
      sections: [
        { heading: 'Key metrics', stats },
        {
          heading: 'Quote funnel by stage',
          table: {
            columns: ['Stage', 'Count'],
            rows: data.byStage.map((s) => [stageLabel(s.stage), String(s.count)]),
          },
        },
        {
          heading: 'Confirmed orders',
          table: {
            columns: ['Order', 'Customer', 'Status', 'Total'],
            rows: data.orders.map((o) => [o.orderNo, o.customerName, o.status, formatInr(o.total)]),
          },
        },
      ],
    });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="page-subtitle mb-0">Catalog, pipeline and order snapshot across the whole platform.</p>
        <button className="btn-primary" onClick={download}>
          <FileDown size={16} /> Download PDF
        </button>
      </div>
      <StatGrid stats={stats} />
      <TablePanel
        title="Quote funnel by stage"
        columns={['Stage', 'Count']}
        rows={data.byStage.map((s) => [stageLabel(s.stage), s.count])}
      />
      <TablePanel
        title="Confirmed orders"
        columns={['Order', 'Customer', 'Status', 'Total']}
        rows={data.orders.map((o) => [o.orderNo, o.customerName, o.status, formatInr(o.total)])}
      />
    </>
  );
}

// ---- SALES MANAGER: pipeline health & rep performance ----
function useManagerReport(token) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    quotationApi
      .list(token, { size: 500 })
      .then((page) => {
        const quotes = page.content;
        const byStage = PIPELINE_STAGES.map((stage) => ({
          stage,
          count: quotes.filter((q) => q.stage === stage).length,
        }));
        const repMap = new Map();
        quotes.forEach((q) => {
          const rep = q.repUsername || 'unassigned';
          const entry = repMap.get(rep) || { rep, count: 0, value: 0, margins: [], risks: [] };
          entry.count += 1;
          entry.value += q.total;
          entry.margins.push(q.marginPercent);
          entry.risks.push(q.riskScore);
          repMap.set(rep, entry);
        });
        const reps = [...repMap.values()].sort((a, b) => b.value - a.value);
        const requiringApproval = quotes.filter((q) => q.approvalStatus && q.approvalStatus !== 'NOT_REQUIRED');
        const highRisk = quotes.filter((q) => q.riskScore >= 70);
        setData({
          quotes,
          byStage,
          reps,
          avgMargin: avg(quotes.map((q) => q.marginPercent)),
          avgRisk: avg(quotes.map((q) => q.riskScore)),
          avgDiscount: avg(quotes.map((q) => (q.subtotal ? (q.discountTotal / q.subtotal) * 100 : 0))),
          requiringApproval,
          highRisk,
        });
      })
      .catch((err) => setError(err.message));
  }, [token]);

  return { data, error };
}

function ManagerReport({ token, username }) {
  const { data, error } = useManagerReport(token);
  if (error) return <p className="status-banner-error">{error}</p>;
  if (!data) return <p className="page-subtitle">Loading report...</p>;

  const stats = [
    { label: 'Open quotations', value: String(data.quotes.length) },
    { label: 'Avg. margin', value: `${data.avgMargin.toFixed(1)}%` },
    { label: 'Avg. discount', value: `${data.avgDiscount.toFixed(1)}%` },
    { label: 'Avg. risk score', value: data.avgRisk.toFixed(1) },
    { label: 'Pending approval', value: String(data.requiringApproval.length) },
    { label: 'High risk (>=70)', value: String(data.highRisk.length) },
  ];

  const download = () =>
    downloadReportPdf({
      title: 'Sales Pipeline & Risk Report',
      subtitle: 'Funnel health, discount discipline and rep performance',
      generatedFor: `${username} (Sales Manager)`,
      filename: `dice-sales-manager-report-${Date.now()}.pdf`,
      sections: [
        { heading: 'Pipeline health', stats },
        {
          heading: 'Quote funnel by stage',
          table: { columns: ['Stage', 'Count'], rows: data.byStage.map((s) => [stageLabel(s.stage), String(s.count)]) },
        },
        {
          heading: 'Rep leaderboard',
          table: {
            columns: ['Rep', 'Quotes', 'Pipeline value', 'Avg margin %', 'Avg risk'],
            rows: data.reps.map((r) => [
              r.rep,
              String(r.count),
              formatInr(r.value),
              avg(r.margins).toFixed(1),
              avg(r.risks).toFixed(1),
            ]),
          },
        },
        {
          heading: 'High-risk quotes (risk score >= 70)',
          table: {
            columns: ['Quote', 'Customer', 'Rep', 'Risk', 'Stage'],
            rows: data.highRisk.map((q) => [q.quoteNo, q.customerName, q.repUsername, q.riskScore.toFixed(1), stageLabel(q.stage)]),
          },
        },
      ],
    });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="page-subtitle mb-0">Funnel health, discount discipline and rep performance.</p>
        <button className="btn-primary" onClick={download}>
          <FileDown size={16} /> Download PDF
        </button>
      </div>
      <StatGrid stats={stats} />
      <TablePanel
        title="Rep leaderboard"
        columns={['Rep', 'Quotes', 'Pipeline value', 'Avg margin %', 'Avg risk']}
        rows={data.reps.map((r) => [r.rep, r.count, formatInr(r.value), `${avg(r.margins).toFixed(1)}%`, avg(r.risks).toFixed(1)])}
      />
      <TablePanel
        title="High-risk quotes (risk score >= 70)"
        columns={['Quote', 'Customer', 'Rep', 'Risk', 'Stage']}
        rows={data.highRisk.map((q) => [q.quoteNo, q.customerName, q.repUsername, q.riskScore.toFixed(1), stageLabel(q.stage)])}
      />
    </>
  );
}

// ---- FINANCE: revenue, margin exposure and billing ----
function useFinanceReport(token) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([quotationApi.list(token, { size: 500 }), dealApi.listMine(token)])
      .then(async ([page, orders]) => {
        const quotes = page.content;
        const billings = await Promise.all(
          orders.map((o) => billingApi.getOrderBilling(token, o.id).catch(() => null))
        );
        let oneTimeRevenue = 0;
        let mrr = 0;
        let creditNotes = 0;
        let refunds = 0;
        const cycleToMonthly = { MONTHLY: 1, QUARTERLY: 1 / 3, ANNUAL: 1 / 12 };
        billings.forEach((b) => {
          if (!b) return;
          oneTimeRevenue += b.invoices
            .filter((i) => i.type === 'ONE_TIME')
            .flatMap((i) => i.lines)
            .reduce((s, l) => s + l.amount, 0);
          mrr += b.subscriptions
            .filter((s) => s.status === 'ACTIVE')
            .reduce((s, sub) => s + sub.quantity * sub.unit_price * (cycleToMonthly[sub.billing_cycle] ?? 1), 0);
          creditNotes += b.creditNotes.reduce((s, c) => s + c.amount, 0);
          refunds += b.refunds.reduce((s, r) => s + r.amount, 0);
        });
        const negativeMarginQuotes = quotes.filter((q) => q.marginPercent < 20);
        setData({
          quotes,
          orders,
          oneTimeRevenue,
          mrr,
          creditNotes,
          refunds,
          negativeMarginQuotes,
          avgMargin: avg(quotes.map((q) => q.marginPercent)),
          totalPipelineValue: quotes.reduce((s, q) => s + q.total, 0),
        });
      })
      .catch((err) => setError(err.message));
  }, [token]);

  return { data, error };
}

function FinanceReport({ token, username }) {
  const { data, error } = useFinanceReport(token);
  if (error) return <p className="status-banner-error">{error}</p>;
  if (!data) return <p className="page-subtitle">Loading report...</p>;

  const stats = [
    { label: 'MRR', value: formatInr(data.mrr) },
    { label: 'One-time revenue', value: formatInr(data.oneTimeRevenue) },
    { label: 'Total pipeline value', value: formatInr(data.totalPipelineValue) },
    { label: 'Credit notes issued', value: formatInr(data.creditNotes) },
    { label: 'Refunds issued', value: formatInr(data.refunds) },
    { label: 'Avg. margin', value: `${data.avgMargin.toFixed(1)}%` },
  ];

  const download = () =>
    downloadReportPdf({
      title: 'Finance & Revenue Report',
      subtitle: 'Revenue, margin exposure, credits and refunds',
      generatedFor: `${username} (Finance)`,
      filename: `dice-finance-report-${Date.now()}.pdf`,
      sections: [
        { heading: 'Revenue summary', stats },
        {
          heading: 'Margin-at-risk quotes (below 20% margin)',
          table: {
            columns: ['Quote', 'Customer', 'Margin %', 'Discount', 'Total'],
            rows: data.negativeMarginQuotes.map((q) => [
              q.quoteNo,
              q.customerName,
              `${q.marginPercent.toFixed(1)}%`,
              formatInr(q.discountTotal),
              formatInr(q.total),
            ]),
          },
        },
        {
          heading: 'Confirmed orders',
          table: {
            columns: ['Order', 'Customer', 'Status', 'Total'],
            rows: data.orders.map((o) => [o.orderNo, o.customerName, o.status, formatInr(o.total)]),
          },
        },
      ],
    });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="page-subtitle mb-0">Revenue, margin exposure, credits and refunds.</p>
        <button className="btn-primary" onClick={download}>
          <FileDown size={16} /> Download PDF
        </button>
      </div>
      <StatGrid stats={stats} />
      <TablePanel
        title="Margin-at-risk quotes (below 20% margin)"
        columns={['Quote', 'Customer', 'Margin %', 'Discount', 'Total']}
        rows={data.negativeMarginQuotes.map((q) => [
          q.quoteNo,
          q.customerName,
          `${q.marginPercent.toFixed(1)}%`,
          formatInr(q.discountTotal),
          formatInr(q.total),
        ])}
      />
      <TablePanel
        title="Confirmed orders"
        columns={['Order', 'Customer', 'Status', 'Total']}
        rows={data.orders.map((o) => [o.orderNo, o.customerName, o.status, formatInr(o.total)])}
      />
    </>
  );
}

export default function Reports() {
  const { token, role, username } = useAuth();

  return (
    <div>
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <FileBarChart size={20} />
        </span>
        Reports
      </h1>

      {role === 'ADMIN' && <AdminReport token={token} username={username} />}
      {role === 'SALES_MANAGER' && <ManagerReport token={token} username={username} />}
      {role === 'FINANCE' && <FinanceReport token={token} username={username} />}
    </div>
  );
}
