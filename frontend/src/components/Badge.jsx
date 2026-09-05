const TONES = {
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-50 text-blue-700',
};

const STATUS_TONE = {
  active: 'green',
  healthy: 'green',
  low: 'green',
  approved: 'green',
  billed: 'green',
  completed: 'green',
  archived: 'gray',
  inactive: 'gray',
  medium: 'amber',
  at_risk: 'amber',
  pending: 'amber',
  high: 'red',
  critical: 'red',
  rejected: 'red',
};

export default function Badge({ tone, children }) {
  const key = String(children).toLowerCase().replace(/\s+/g, '_');
  const resolvedTone = tone || STATUS_TONE[key] || 'blue';
  return <span className={`badge ${TONES[resolvedTone]}`}>{children}</span>;
}
