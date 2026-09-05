import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flame, X, FileText, ShoppingCart, PackageSearch } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, stageLabel, formatInr } from '../../quotationApi.js';

const APPROVAL_DISCOUNT_THRESHOLD = 15;

function round(value) {
  return Math.round(value * 100) / 100;
}

function computeLine(line) {
  const subtotal = line.quantity * line.unitPrice;
  const discountAmount = (subtotal * line.discountPercent) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * line.taxPercent) / 100;
  const lineTotal = taxable + taxAmount;
  const cost = line.quantity * (line.costPrice || 0);
  const margin = taxable - cost;
  return { ...line, subtotal: round(subtotal), discountAmount: round(discountAmount), taxAmount: round(taxAmount), lineTotal: round(lineTotal), margin: round(margin) };
}

function computeTotals(lines) {
  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const discountTotal = lines.reduce((s, l) => s + l.discountAmount, 0);
  const taxTotal = lines.reduce((s, l) => s + l.taxAmount, 0);
  const total = lines.reduce((s, l) => s + l.lineTotal, 0);
  const grossMargin = lines.reduce((s, l) => s + l.margin, 0);
  const marginPercent = total > 0 ? round((grossMargin / total) * 100) : 0;
  return { subtotal: round(subtotal), discountTotal: round(discountTotal), taxTotal: round(taxTotal), total: round(total), grossMargin: round(grossMargin), marginPercent };
}

export default function QuotationBuilder() {
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [category, setCategory] = useState('');
  const [lines, setLines] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [stage, setStage] = useState('DRAFT');
  const [approvalStatus, setApprovalStatus] = useState('NOT_REQUIRED');
  const [quoteNo, setQuoteNo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    quotationApi.customers(token).then(setCustomers).catch((err) => setError(err.message));
    quotationApi.products(token).then(setProducts).catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    if (isNew) return;
    quotationApi
      .get(token, id)
      .then((q) => {
        setCustomerId(String(q.customerId));
        setStage(q.stage);
        setApprovalStatus(q.approvalStatus);
        setQuoteNo(q.quoteNo);
        setLines(
          q.lines.map((l) =>
            computeLine({
              productId: l.productId,
              productName: l.productName,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountPercent: l.discountPercent,
              taxPercent: l.taxPercent,
              costPrice: 0,
            })
          )
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isNew, token]);

  useEffect(() => {
    if (lines.length === 0) {
      setRecommendations([]);
      return;
    }
    quotationApi
      .recommendations(token, lines.map((l) => l.productId))
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [lines.map((l) => l.productId).join(','), token]);

  const filteredProducts = products.filter(
    (p) =>
      (!productQuery || p.name.toLowerCase().includes(productQuery.toLowerCase())) &&
      (!category || p.category === category)
  );
  const categories = [...new Set(products.map((p) => p.category))];

  const totals = useMemo(() => computeTotals(lines), [lines]);
  const isDraft = stage === 'DRAFT';
  const needsApproval = totals.subtotal > 0 && (totals.discountTotal / totals.subtotal) * 100 > APPROVAL_DISCOUNT_THRESHOLD;

  const addToCart = (product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? computeLine({ ...l, quantity: l.quantity + 1 }) : l));
      }
      return [
        ...prev,
        computeLine({
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.unitPrice,
          discountPercent: 0,
          taxPercent: product.taxRate,
          costPrice: product.costPrice,
        }),
      ];
    });
  };

  const updateLine = (productId, patch) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? computeLine({ ...l, ...patch }) : l)));
  };

  const removeLine = (productId) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const buildRequest = () => ({
    customerId: Number(customerId),
    lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, discountPercent: l.discountPercent })),
  });

  const save = async () => {
    if (!customerId || lines.length === 0) {
      setError('Pick a customer and add at least one product first.');
      return null;
    }
    setSaving(true);
    setError('');
    try {
      const saved = isNew
        ? await quotationApi.create(token, buildRequest())
        : await quotationApi.update(token, id, buildRequest());
      if (isNew) navigate(`/workspace/quotations/${saved.id}`, { replace: true });
      setStage(saved.stage);
      setApprovalStatus(saved.approvalStatus);
      setQuoteNo(saved.quoteNo);
      return saved;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submitApproval = async () => {
    const saved = await save();
    const quotationId = saved?.id ?? id;
    if (!quotationId || quotationId === 'new') return;
    try {
      const updated = await quotationApi.transition(token, quotationId, 'PENDING_APPROVAL');
      setStage(updated.stage);
      setApprovalStatus(updated.approvalStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  const sendToCustomer = async () => {
    try {
      const updated = await quotationApi.transition(token, id, 'ORDERED');
      setStage(updated.stage);
      setApprovalStatus(updated.approvalStatus);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="empty-state">Loading quotation...</div>;

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
              <FileText size={20} />
            </span>
            {isNew ? 'New Quotation' : quoteNo}
          </h1>
          <p className="page-subtitle mb-0">
            {isNew ? 'Build a quote for a customer.' : `Stage: ${stageLabel(stage)}`}
          </p>
        </div>
        <select className="input w-auto" value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!isDraft}>
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.tier})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="status-banner-error mb-4">{error}</p>}

      <div className="grid gap-5 items-start lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,300px)]">
        <div className="panel">
          <h2 className="font-bold text-odooink mb-3">Product Selector</h2>
          <input
            className="input w-full mb-2"
            placeholder="Search products..."
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
          />
          <select className="input w-full mb-2" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {filteredProducts.length === 0 && (
            <div className="empty-state py-6">
              <PackageSearch className="mx-auto text-gray-300 mb-2" size={28} />
              <p className="text-sm text-gray-400">No products match.</p>
            </div>
          )}
          <div className="divide-y divide-gray-100">
            {filteredProducts.map((p) => (
              <div className="flex justify-between items-center py-2.5 text-sm" key={p.id}>
                <div>
                  <div className="text-odooink font-medium">{p.name}</div>
                  <div className="text-xs text-gray-400">
                    {p.variant} - {formatInr(p.unitPrice)}
                  </div>
                </div>
                <button className="btn-secondary !px-3 !py-1.5 text-xs" disabled={!isDraft} onClick={() => addToCart(p)}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 className="font-bold text-odooink mb-3">Cart</h2>
          {lines.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="font-medium text-gray-500">No products added yet.</p>
              <p className="text-xs text-gray-400 mt-0.5">Add items from the product selector on the left.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    {['Product', 'Qty', 'Unit Price', 'Discount %', 'Tax %', 'Subtotal', 'Margin', ''].map((h) => (
                      <th key={h} className="text-left px-2 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.productId}>
                      <td className="px-2 py-2 border-b border-gray-50">{l.productName}</td>
                      <td className="px-2 py-2 border-b border-gray-50">
                        <input
                          type="number"
                          min="1"
                          className="input !w-16 !py-1"
                          value={l.quantity}
                          disabled={!isDraft}
                          onChange={(e) => updateLine(l.productId, { quantity: Number(e.target.value) || 1 })}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-gray-50">{formatInr(l.unitPrice)}</td>
                      <td className="px-2 py-2 border-b border-gray-50">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input !w-16 !py-1"
                          value={l.discountPercent}
                          disabled={!isDraft}
                          onChange={(e) => updateLine(l.productId, { discountPercent: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-2 border-b border-gray-50">{l.taxPercent}%</td>
                      <td className="px-2 py-2 border-b border-gray-50">{formatInr(l.lineTotal)}</td>
                      <td className="px-2 py-2 border-b border-gray-50">{formatInr(l.margin)}</td>
                      <td className="px-2 py-2 border-b border-gray-50">
                        {isDraft && (
                          <button className="text-gray-400 hover:text-red-600" onClick={() => removeLine(l.productId)}>
                            <X size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mt-4 card p-4">
            <div>
              <div className="stat-label">Subtotal</div>
              <div className="text-lg font-bold text-odooink">{formatInr(totals.subtotal)}</div>
            </div>
            <div>
              <div className="stat-label">Discount</div>
              <div className="text-lg font-bold text-odooink">{formatInr(totals.discountTotal)}</div>
            </div>
            <div>
              <div className="stat-label">Tax</div>
              <div className="text-lg font-bold text-odooink">{formatInr(totals.taxTotal)}</div>
            </div>
            <div>
              <div className="stat-label">Total</div>
              <div className="text-lg font-bold text-odooink">{formatInr(totals.total)}</div>
            </div>
            <div>
              <div className="stat-label">Gross Margin</div>
              <div className="text-lg font-bold text-odooink">{formatInr(totals.grossMargin)}</div>
            </div>
            <div>
              <div className="stat-label">Margin %</div>
              <div className="text-lg font-bold text-odooink">{totals.marginPercent}%</div>
            </div>
            <div className="col-span-2">
              <div className="stat-label">Approval</div>
              <div className="text-lg font-bold text-odooink">
                {isNew || isDraft ? (needsApproval ? 'Needs Approval' : 'Auto-eligible') : approvalStatus}
              </div>
            </div>
          </div>

          <div className="panel-actions">
            <button className="btn-secondary" disabled={!isDraft || saving} onClick={save}>
              Save Draft
            </button>
            <button className="btn-primary" disabled={!isDraft || saving} onClick={submitApproval}>
              Submit Approval
            </button>
            <button className="btn-primary" disabled={stage !== 'APPROVED'} onClick={sendToCustomer}>
              Send Customer
            </button>
          </div>
        </div>

        <div className="panel">
          <h2 className="font-bold text-odooink mb-3 flex items-center gap-1.5">
            <Flame size={17} className="text-amber-500" />
            Recommended
          </h2>
          {recommendations.filter((r) => !dismissed.includes(r.productId)).length === 0 ? (
            <div className="empty-state">No suggestions for this cart.</div>
          ) : (
            <div className="space-y-3">
              {recommendations
                .filter((r) => !dismissed.includes(r.productId))
                .map((r) => (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm" key={r.productId}>
                    <div className="font-bold text-amber-800 mb-1">{r.productName}</div>
                    <div className="text-gray-600 mb-1.5">Why: {r.reason}</div>
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Margin: +{r.marginImpactPercent}%</span>
                      <span>{r.promotion}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary !px-3 !py-1.5 text-xs"
                        disabled={!isDraft}
                        onClick={() => {
                          const product = products.find((p) => p.id === r.productId);
                          if (product) addToCart(product);
                        }}
                      >
                        Add
                      </button>
                      <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setDismissed((d) => [...d, r.productId])}>
                        Dismiss
                      </button>
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
