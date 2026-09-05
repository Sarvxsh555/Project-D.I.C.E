import { useState } from 'react';
import { ArrowRight, Percent } from 'lucide-react';
import CrudTable from './CrudTable.jsx';
import Badge from '../../components/Badge.jsx';
import { adminApi } from '../../api.js';

const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const CATEGORIES = ['Electronics', 'Apparel', 'Home & Kitchen', 'Sporting Goods', 'Office Supplies'];
const RISK_LEVELS = ['low', 'medium', 'high'];

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
    render: (v) => <Badge>{v}</Badge>,
  },
  { key: 'approvalLevel', label: 'Approval level', type: 'select', options: ['Sales Manager', 'Finance'], required: true },
];

function ApprovalChain() {
  const steps = ['Discount Request', 'Sales Manager', 'Finance', 'Approved'];
  return (
    <div className="panel flex flex-wrap items-center gap-3">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-3">
          <div className="rounded-lg bg-odoo-50 text-odoo-700 px-4 py-2 text-sm font-semibold">{step}</div>
          {i < steps.length - 1 && <ArrowRight size={16} className="text-gray-300" />}
        </div>
      ))}
    </div>
  );
}

export default function DiscountPolicies() {
  const [tab, setTab] = useState('rules');

  return (
    <div>
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <Percent size={20} />
        </span>
        Discount Policies
      </h1>
      <p className="page-subtitle">
        Configure discount rules by customer tier and category, and view the approval chain for
        discounts that exceed policy limits.
      </p>

      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {[
          { key: 'rules', label: 'Discount Rules' },
          { key: 'chain', label: 'Approval Chains' },
        ].map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-odoo-600 text-odoo-700' : 'border-transparent text-gray-500 hover:text-odooink'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rules' ? (
        <CrudTable
          entityLabel="discount rule"
          fields={ruleFields}
          resource={adminApi.discountRules}
          searchKeys={['customerTier', 'category']}
        />
      ) : (
        <ApprovalChain />
      )}
    </div>
  );
}
