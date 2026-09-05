import CrudTable from './CrudTable.jsx';
import Badge from '../../components/Badge.jsx';
import { adminApi } from '../../api.js';

const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];

const fields = [
  { key: 'customerTier', label: 'Customer tier', type: 'select', options: TIERS, required: true },
  { key: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, required: true },
  { key: 'product', label: 'Product', required: true },
  { key: 'price', label: 'Price', type: 'number', required: true },
  { key: 'effectiveDate', label: 'Effective date', type: 'date', required: true },
  {
    key: 'status',
    label: 'Active / Inactive',
    type: 'select',
    options: ['active', 'inactive'],
    render: (v) => <Badge>{v}</Badge>,
  },
];

export default function PriceLists() {
  return (
    <CrudTable
      title="Price Lists"
      subtitle="Manage tiered, multi-currency pricing per product with effective dates."
      entityLabel="price list entry"
      fields={fields}
      resource={adminApi.priceLists}
      searchKeys={['product', 'customerTier', 'currency']}
    />
  );
}
