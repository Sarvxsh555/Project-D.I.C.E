import { useState } from 'react';
import CrudTable from './CrudTable.jsx';

const initialRows = [
  { id: 1, productA: 'Wireless Mouse', productB: 'USB-C Hub', coPurchaseScore: 0.72, promotion: 'Bundle 10% off', minimumMargin: 15, priority: 1 },
  { id: 2, productA: 'Running Shoes', productB: 'Athletic Socks', coPurchaseScore: 0.61, promotion: 'None', minimumMargin: 20, priority: 2 },
  { id: 3, productA: 'Stainless Steel Kettle', productB: 'Tea Set', coPurchaseScore: 0.45, promotion: 'Free shipping', minimumMargin: 12, priority: 3 },
];

const fields = [
  { key: 'productA', label: 'Product A', required: true },
  { key: 'productB', label: 'Product B', required: true },
  { key: 'coPurchaseScore', label: 'Co-purchase score', type: 'number', required: true },
  { key: 'promotion', label: 'Promotion', required: true },
  { key: 'minimumMargin', label: 'Minimum margin (%)', type: 'number', required: true },
  { key: 'priority', label: 'Priority', type: 'number', required: true },
];

export default function RecommendationRules() {
  const [rows, setRows] = useState(initialRows);

  return (
    <CrudTable
      title="Recommendation Rules"
      subtitle="Map product-to-product recommendations with co-purchase score, promotion and margin guardrails."
      fields={fields}
      rows={rows}
      setRows={setRows}
      searchKeys={['productA', 'productB']}
    />
  );
}
