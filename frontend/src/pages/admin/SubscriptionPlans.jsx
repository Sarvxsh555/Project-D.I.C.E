import { useState } from 'react';
import CrudTable from './CrudTable.jsx';

const initialRows = [
  { id: 1, name: 'Starter Monthly', billingCycle: 'Monthly', price: 9.99, proration: 'Enabled', cancellation: 'End of cycle', refund: 'None' },
  { id: 2, name: 'Pro Quarterly', billingCycle: 'Quarterly', price: 24.99, proration: 'Enabled', cancellation: 'Immediate', refund: 'Prorated' },
  { id: 3, name: 'Enterprise Yearly', billingCycle: 'Yearly', price: 199.0, proration: 'Disabled', cancellation: 'End of cycle', refund: 'Full within 14 days' },
];

const fields = [
  { key: 'name', label: 'Plan name', required: true },
  { key: 'billingCycle', label: 'Billing cycle', type: 'select', options: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  { key: 'price', label: 'Price', type: 'number', required: true },
  { key: 'proration', label: 'Proration', type: 'select', options: ['Enabled', 'Disabled'], required: true },
  { key: 'cancellation', label: 'Cancellation policy', type: 'select', options: ['Immediate', 'End of cycle'], required: true },
  { key: 'refund', label: 'Refund policy', type: 'select', options: ['None', 'Prorated', 'Full within 14 days'], required: true },
];

export default function SubscriptionPlans() {
  const [rows, setRows] = useState(initialRows);

  return (
    <CrudTable
      title="Subscription Plans"
      subtitle="Define billing cycles with proration, cancellation and refund policies."
      fields={fields}
      rows={rows}
      setRows={setRows}
      searchKeys={['name', 'billingCycle']}
    />
  );
}
