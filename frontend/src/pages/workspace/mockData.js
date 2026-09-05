export const initialQuotations = [
  { id: 1, quoteNo: 'Q-1042', customer: 'Acme Corp', amount: 12500, stage: 'Sent', createdOn: '2026-08-20' },
  { id: 2, quoteNo: 'Q-1043', customer: 'Globex Inc', amount: 8900, stage: 'Draft', createdOn: '2026-08-25' },
  { id: 3, quoteNo: 'Q-1044', customer: 'Initech', amount: 21000, stage: 'Approved', createdOn: '2026-08-30' },
  { id: 4, quoteNo: 'Q-1045', customer: 'Umbrella LLC', amount: 5400, stage: 'Rejected', createdOn: '2026-09-01' },
];

export const initialDeals = [
  { id: 1, name: 'Acme Corp - Office Refresh', amount: 12500, stage: 'New' },
  { id: 2, name: 'Globex Inc - Annual Contract', amount: 45000, stage: 'Qualified' },
  { id: 3, name: 'Initech - Kettle Bulk Order', amount: 21000, stage: 'Proposal' },
  { id: 4, name: 'Umbrella LLC - Shoe Line', amount: 5400, stage: 'Negotiation' },
  { id: 5, name: 'Soylent Co - Paper Supplies', amount: 3200, stage: 'Won' },
  { id: 6, name: 'Hooli - Mouse Bundle', amount: 1800, stage: 'Lost' },
];

export const PIPELINE_STAGES = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export const initialCustomers = [
  { id: 1, name: 'Acme Corp', tier: 'Gold', email: 'buyer@acme.com', region: 'North', lastOrder: '2026-08-20' },
  { id: 2, name: 'Globex Inc', tier: 'Platinum', email: 'procurement@globex.com', region: 'West', lastOrder: '2026-08-28' },
  { id: 3, name: 'Initech', tier: 'Silver', email: 'orders@initech.com', region: 'South', lastOrder: '2026-08-30' },
  { id: 4, name: 'Umbrella LLC', tier: 'Bronze', email: 'contact@umbrella.com', region: 'East', lastOrder: '2026-09-01' },
];

export const initialTasks = [
  { id: 1, title: 'Follow up with Acme Corp on Q-1042', due: '2026-09-06', done: false },
  { id: 2, title: 'Prepare proposal for Initech bulk order', due: '2026-09-07', done: false },
  { id: 3, title: 'Send renewal reminder to Globex Inc', due: '2026-09-08', done: false },
  { id: 4, title: 'Log call notes for Umbrella LLC', due: '2026-09-04', done: true },
];

export const initialNotifications = [
  { id: 1, icon: '✅', title: 'Quote Q-1044 was approved by Finance', time: '2 hours ago', unread: true },
  { id: 2, icon: '⚠️', title: 'Discount on Q-1043 exceeds policy limit — needs Sales Manager approval', time: '5 hours ago', unread: true },
  { id: 3, icon: '📦', title: 'Order for Initech shipped from South Depot', time: 'Yesterday', unread: false },
  { id: 4, icon: '💬', title: 'Globex Inc replied to your last email', time: '2 days ago', unread: false },
];

export const UNREAD_NOTIFICATION_COUNT = initialNotifications.filter((n) => n.unread).length;
