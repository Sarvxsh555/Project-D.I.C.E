export function formatCurrency(
  value: number | string | null | undefined,
  currency = 'INR'
): string {
  if (value === null || value === undefined) return '₹0'
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numeric)) return '₹0'

  if (currency === 'INR') {
    // Format according to Indian Numbering System: e.g. ₹4,34,000
    const rounded = Math.round(numeric)
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(rounded)
    return `₹${formatted}`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function formatPercent(
  value: number | string | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined) return '0.0%'
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numeric)) return '0.0%'

  return `${numeric.toFixed(decimals)}%`
}

export function formatCompactNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0'
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numeric)) return '0'

  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(numeric)
}
