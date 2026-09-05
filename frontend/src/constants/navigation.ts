export interface NavItem {
  name: string
  href: string
  badgeKey?: 'pendingApprovals' | 'atRiskDeals'
  roles?: string[]
}

export const TOP_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/' },
  { name: 'Quotations', href: '/quotations' },
  { name: 'Approvals', href: '/approvals', badgeKey: 'pendingApprovals' },
  { name: 'Fulfillment', href: '/fulfillment' },
  { name: 'Billing', href: '/billing' },
  { name: 'Negotiations', href: '/negotiations' },
  { name: 'Invoices', href: '/invoices' },
  { name: 'Deal Health', href: '/deal-health', badgeKey: 'atRiskDeals' },
  { name: 'Admin', href: '/admin', roles: ['ADMIN'] },
]
