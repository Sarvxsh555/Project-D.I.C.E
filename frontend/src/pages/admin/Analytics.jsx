const stats = [
  { label: 'Revenue (30d)', value: '$482,300' },
  { label: 'Quotes generated', value: '1,204' },
  { label: 'Orders placed', value: '918' },
  { label: 'Approval rate', value: '87%' },
];

const discountDistribution = [
  { label: '0-10%', value: 42 },
  { label: '10-20%', value: 31 },
  { label: '20-30%', value: 18 },
  { label: '30%+', value: 9 },
];

const productPerformance = [
  { label: 'Wireless Mouse', value: 92 },
  { label: 'Running Shoes', value: 78 },
  { label: 'Stainless Steel Kettle', value: 54 },
  { label: 'A4 Copy Paper', value: 40 },
];

const salesPerformance = [
  { label: 'North Region', value: 88 },
  { label: 'West Region', value: 73 },
  { label: 'South Region', value: 65 },
  { label: 'East Region', value: 58 },
];

function BarList({ title, data }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="bar-list">
      <h3>{title}</h3>
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span>{d.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span>{d.value}{title === 'Discount distribution' ? '%' : ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  return (
    <div>
      <h1>Analytics</h1>
      <p className="admin-subtitle">Revenue, quotes, orders, approval rate, discount distribution and performance.</p>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <BarList title="Discount distribution" data={discountDistribution} />
      <BarList title="Product performance" data={productPerformance} />
      <BarList title="Sales performance" data={salesPerformance} />
    </div>
  );
}
