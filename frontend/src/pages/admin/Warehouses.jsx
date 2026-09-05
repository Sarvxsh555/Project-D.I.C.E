import { Warehouse } from 'lucide-react';
import CrudTable from './CrudTable.jsx';
import { adminApi } from '../../api.js';

const fields = [
  { key: 'name', label: 'Name', required: true },
  { key: 'location', label: 'Location', required: true },
  { key: 'stock', label: 'Stock', type: 'number', required: true },
  { key: 'replenishment', label: 'Replenishment', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'], required: true },
  { key: 'shippingWeight', label: 'Shipping weight class', type: 'select', options: ['Light', 'Standard', 'Heavy'], required: true },
];

export default function Warehouses() {
  return (
    <CrudTable
      title="Warehouses"
      icon={Warehouse}
      subtitle="Manage warehouse locations, stock levels, replenishment schedule and shipping weight class."
      entityLabel="warehouse"
      fields={fields}
      resource={adminApi.warehouses}
      searchKeys={['name', 'location']}
    />
  );
}
