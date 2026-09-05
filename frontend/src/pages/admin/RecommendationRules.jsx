import CrudTable from './CrudTable.jsx';
import { adminApi } from '../../api.js';

const fields = [
  { key: 'productA', label: 'Product A', required: true },
  { key: 'productB', label: 'Product B', required: true },
  { key: 'coPurchaseScore', label: 'Co-purchase score', type: 'number', required: true },
  { key: 'promotion', label: 'Promotion', required: true },
  { key: 'minimumMargin', label: 'Minimum margin (%)', type: 'number', required: true },
  { key: 'priority', label: 'Priority', type: 'number', required: true },
];

export default function RecommendationRules() {
  return (
    <CrudTable
      title="Recommendation Rules"
      subtitle="Map product-to-product recommendations with co-purchase score, promotion and margin guardrails."
      entityLabel="recommendation rule"
      fields={fields}
      resource={adminApi.recommendationRules}
      searchKeys={['productA', 'productB']}
    />
  );
}
