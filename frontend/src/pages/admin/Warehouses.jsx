import { useState } from 'react';
import CrudTable from './CrudTable.jsx';

const initialRows = [
  { id: 1, name: 'North DC', location: 'Chicago, IL', stock: 12500, replenishment: 'Weekly', shippingWeight: 'Standard' },
  { id: 2, name: 'West Hub', location: 'Reno, NV', stock: 8300, replenishment: 'Bi-weekly', shippingWeight: 'Heavy' },
  { id: 3, name: 'South Depot', location: 'Atlanta, GA', stock: 15900, replenishment: 'Weekly', shippingWeight: 'Standard' },
];

const fields = [
  { key: 'name', label: 'Name', required: true },
  { key: 'location', label: 'Location', required: true },
  { key: 'stock', label: 'Stock', type: 'number', required: true },
  { key: 'replenishment', label: 'Replenishment', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'], required: true },
  { key: 'shippingWeight', label: 'Shipping weight class', type: 'select', options: ['Light', 'Standard', 'Heavy'], required: true },
];

export default function Warehouses() {
  const [rows, setRows] = useState(initialRows);

  return (
    <CrudTable
      title="Warehouses"
      subtitle="Manage warehouse locations, stock levels, replenishment schedule and shipping weight class."
      fields={fields}
      rows={rows}
      setRows={setRows}
      searchKeys={['name', 'location']}
    />
  );
}
