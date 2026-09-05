import { useState } from 'react';
import CrudTable from './CrudTable.jsx';
import './admin.css';

const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const CATEGORIES = ['Electronics', 'Apparel', 'Home & Kitchen', 'Sporting Goods', 'Office Supplies'];
const RISK_LEVELS = ['low', 'medium', 'high'];

const initialRules = [
  { id: 1, customerTier: 'Gold', category: 'Electronics', minDiscount: 5, maxDiscount: 15, riskLevel: 'low', approvalLevel: 'Sales Manager' },
  { id: 2, customerTier: 'Platinum', category: 'Apparel', minDiscount: 10, maxDiscount: 30, riskLevel: 'medium', approvalLevel: 'Finance' },
  { id: 3, customerTier: 'Silver', category: 'Home & Kitchen', minDiscount: 0, maxDiscount: 10, riskLevel: 'low', approvalLevel: 'Sales Manager' },
  { id: 4, customerTier: 'Bronze', category: 'Sporting Goods', minDiscount: 15, maxDiscount: 40, riskLevel: 'high', approvalLevel: 'Finance' },
];

const ruleFields = [
  { key: 'customerTier', label: 'Customer tier', type: 'select', options: TIERS, required: true },
  { key: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true },
  { key: 'minDiscount', label: 'Min discount (%)', type: 'number', required: true },
  { key: 'maxDiscount', label: 'Max discount (%)', type: 'number', required: true },
  {
    key: 'riskLevel',
    label: 'Risk level',
    type: 'select',
    options: RISK_LEVELS,
    required: true,
    render: (v) => <span className={`pill ${v}`}>{v}</span>,
  },
  { key: 'approvalLevel', label: 'Approval level', type: 'select', options: ['Sales Manager', 'Finance'], required: true },
];

function ApprovalChain() {
  return (
    <div className="chain-flow">
      <div className="chain-step">Discount Request</div>
      <span className="chain-arrow">→</span>
      <div className="chain-step">Sales Manager</div>
      <span className="chain-arrow">→</span>
      <div className="chain-step">Finance</div>
      <span className="chain-arrow">→</span>
      <div className="chain-step">Approved</div>
    </div>
  );
}

export default function DiscountPolicies() {
  const [rows, setRows] = useState(initialRules);
  const [tab, setTab] = useState('rules');

  return (
    <div>
      <h1>Discount Policies</h1>
      <p className="admin-subtitle">
        Configure discount rules by customer tier and category, and view the approval chain for
        discounts that exceed policy limits.
      </p>

      <div className="module-tabs">
        <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
          Discount Rules
        </button>
        <button className={tab === 'chain' ? 'active' : ''} onClick={() => setTab('chain')}>
          Approval Chains
        </button>
      </div>

      {tab === 'rules' ? (
        <CrudTable fields={ruleFields} rows={rows} setRows={setRows} searchKeys={['customerTier', 'category']} title="" />
      ) : (
        <ApprovalChain />
      )}
    </div>
  );
}
