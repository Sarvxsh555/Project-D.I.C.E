import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { quotationApi, stageLabel, formatInr } from '../../quotationApi.js';
import '../admin/admin.css';

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

  if (loading) return <div className="admin-empty">Loading quotation...</div>;

  return (
    <div>
      <div className="admin-toolbar" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>{isNew ? 'New Quotation' : quoteNo}</h1>
          <p className="ws-subtitle">
            {isNew ? 'Build a quote for a customer.' : `Stage: ${stageLabel(stage)}`}
          </p>
        </div>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!isDraft}>
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.tier})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="status error">{error}</p>}

      <div className="builder-layout">
        <div className="builder-panel">
          <h2>Product Selector</h2>
          <input
            className="admin-search"
            placeholder="Search products..."
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem' }}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div>
            {filteredProducts.map((p) => (
              <div className="product-result" key={p.id}>
                <div>
                  <div>{p.name}</div>
                  <div className="product-result-meta">
                    {p.variant} - {formatInr(p.unitPrice)}
                  </div>
                </div>
                <button className="admin-btn secondary" disabled={!isDraft} onClick={() => addToCart(p)}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="builder-panel">
          <h2>Cart</h2>
          {lines.length === 0 ? (
            <div className="admin-empty">No products added yet.</div>
          ) : (
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount %</th>
                  <th>Tax %</th>
                  <th>Subtotal</th>
                  <th>Margin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.productId}>
                    <td>{l.productName}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={l.quantity}
                        disabled={!isDraft}
                        onChange={(e) => updateLine(l.productId, { quantity: Number(e.target.value) || 1 })}
                      />
                    </td>
                    <td>{formatInr(l.unitPrice)}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={l.discountPercent}
                        disabled={!isDraft}
                        onChange={(e) => updateLine(l.productId, { discountPercent: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td>{l.taxPercent}%</td>
                    <td>{formatInr(l.lineTotal)}</td>
                    <td>{formatInr(l.margin)}</td>
                    <td>
                      {isDraft && (
                        <button className="admin-btn secondary" onClick={() => removeLine(l.productId)}>
                          x
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="builder-totals">
            <div>
              <div className="stat-label">Subtotal</div>
              <div className="stat-value">{formatInr(totals.subtotal)}</div>
            </div>
            <div>
              <div className="stat-label">Discount</div>
              <div className="stat-value">{formatInr(totals.discountTotal)}</div>
            </div>
            <div>
              <div className="stat-label">Tax</div>
              <div className="stat-value">{formatInr(totals.taxTotal)}</div>
            </div>
            <div>
              <div className="stat-label">Total</div>
              <div className="stat-value">{formatInr(totals.total)}</div>
            </div>
            <div>
              <div className="stat-label">Gross Margin</div>
              <div className="stat-value">{formatInr(totals.grossMargin)}</div>
            </div>
            <div>
              <div className="stat-label">Margin %</div>
              <div className="stat-value">{totals.marginPercent}%</div>
            </div>
            <div>
              <div className="stat-label">Approval</div>
              <div className="stat-value">
                {isNew || isDraft ? (needsApproval ? 'Needs Approval' : 'Auto-eligible') : approvalStatus}
              </div>
            </div>
          </div>

          <div className="builder-actions">
            <button className="admin-btn secondary" disabled={!isDraft || saving} onClick={save}>
              Save Draft
            </button>
            <button className="admin-btn" disabled={!isDraft || saving} onClick={submitApproval}>
              Submit Approval
            </button>
            <button className="admin-btn" disabled={stage !== 'APPROVED'} onClick={sendToCustomer}>
              Send Customer
            </button>
          </div>
        </div>

        <div className="builder-panel">
          <h2>🔥 Recommended</h2>
          {recommendations.filter((r) => !dismissed.includes(r.productId)).length === 0 ? (
            <div className="admin-empty">No suggestions for this cart.</div>
          ) : (
            recommendations
              .filter((r) => !dismissed.includes(r.productId))
              .map((r) => (
                <div className="recommendation-card" key={r.productId}>
                  <div className="rec-title">{r.productName}</div>
                  <div className="rec-why">Why: {r.reason}</div>
                  <div className="rec-stats">
                    <span>Margin: +{r.marginImpactPercent}%</span>
                    <span>{r.promotion}</span>
                  </div>
                  <div className="rec-actions">
                    <button
                      className="admin-btn"
                      disabled={!isDraft}
                      onClick={() => {
                        const product = products.find((p) => p.id === r.productId);
                        if (product) addToCart(product);
                      }}
                    >
                      Add
                    </button>
                    <button className="admin-btn secondary" onClick={() => setDismissed((d) => [...d, r.productId])}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
