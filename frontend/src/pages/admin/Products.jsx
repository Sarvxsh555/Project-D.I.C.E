import CrudTable from './CrudTable.jsx';
import { adminApi } from '../../api.js';

const CATEGORIES = ['Electronics', 'Apparel', 'Home & Kitchen', 'Sporting Goods', 'Office Supplies'];
const UNITS = ['each', 'kg', 'litre', 'box', 'pallet'];

const fields = [
  { key: 'name', label: 'Name', required: true },
  { key: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true },
  { key: 'variant', label: 'Variant', required: true },
  { key: 'taxRate', label: 'Tax rate (%)', type: 'number', required: true },
  { key: 'unit', label: 'Unit', type: 'select', options: UNITS, required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: ['active', 'archived'],
    render: (v) => <span className={`pill ${v}`}>{v}</span>,
  },
];

export default function Products() {
  return (
    <CrudTable
      title="Products"
      subtitle="Manage catalog items: create, edit, archive, categories, variants, tax, unit and description."
      entityLabel="product"
      fields={fields}
      resource={adminApi.products}
      searchKeys={['name', 'category', 'variant']}
      archivable
    />
  );
}
