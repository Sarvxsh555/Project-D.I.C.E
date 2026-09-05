import CrudTable from './CrudTable.jsx';
import { adminApi } from '../../api.js';

const fields = [
  { key: 'name', label: 'Plan name', required: true },
  { key: 'billingCycle', label: 'Billing cycle', type: 'select', options: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  { key: 'price', label: 'Price', type: 'number', required: true },
  { key: 'proration', label: 'Proration', type: 'select', options: ['Enabled', 'Disabled'], required: true },
  { key: 'cancellation', label: 'Cancellation policy', type: 'select', options: ['Immediate', 'End of cycle'], required: true },
  { key: 'refund', label: 'Refund policy', type: 'select', options: ['None', 'Prorated', 'Full within 14 days'], required: true },
];

export default function SubscriptionPlans() {
  return (
    <CrudTable
      title="Subscription Plans"
      subtitle="Define billing cycles with proration, cancellation and refund policies."
      entityLabel="subscription plan"
      fields={fields}
      resource={adminApi.subscriptionPlans}
      searchKeys={['name', 'billingCycle']}
    />
  );
}
