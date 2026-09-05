import { useState } from 'react';
import CrudTable from './CrudTable.jsx';

const TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];

const initialRows = [
  { id: 1, customerTier: 'Gold', currency: 'USD', product: 'Wireless Mouse', price: 24.99, effectiveDate: '2026-01-01', status: 'active' },
  { id: 2, customerTier: 'Silver', currency: 'USD', product: 'Running Shoes', price: 59.0, effectiveDate: '2026-02-15', status: 'active' },
  { id: 3, customerTier: 'Platinum', currency: 'EUR', product: 'Stainless Steel Kettle', price: 39.5, effectiveDate: '2025-11-01', status: 'inactive' },
  { id: 4, customerTier: 'Bronze', currency: 'INR', product: 'A4 Copy Paper', price: 350, effectiveDate: '2026-03-01', status: 'active' },
];

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
    render: (v) => <span className={`pill ${v}`}>{v}</span>,
  },
];

export default function PriceLists() {
  const [rows, setRows] = useState(initialRows);

  return (
    <CrudTable
      title="Price Lists"
      subtitle="Manage tiered, multi-currency pricing per product with effective dates."
      fields={fields}
      rows={rows}
      setRows={setRows}
      searchKeys={['product', 'customerTier', 'currency']}
    />
  );
}
