import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';
import './admin.css';

// Each nav item lists the roles that power it, per the RBAC table: Admin owns platform
// config; Sales Manager owns discount policy + deal health; Finance owns fulfillment,
// billing and the second approval step; all three share the approval queue.
const NAV_ITEMS = [
  { to: '/admin/deal-health', label: 'Deal Health', roles: ['ADMIN', 'SALES_MANAGER'] },
  { to: '/admin/approvals', label: 'Approvals', roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
  { to: '/admin/fulfillment', label: 'Fulfillment', roles: ['ADMIN', 'FINANCE'] },
  { to: '/admin/billing', label: 'Billing', roles: ['ADMIN', 'FINANCE'] },
  { to: '/admin/products', label: 'Products', roles: ['ADMIN'] },
  { to: '/admin/price-lists', label: 'Price Lists', roles: ['ADMIN'] },
  { to: '/admin/discount-policies', label: 'Discount Policies', roles: ['ADMIN', 'SALES_MANAGER'] },
  { to: '/admin/warehouses', label: 'Warehouses', roles: ['ADMIN'] },
  { to: '/admin/subscription-plans', label: 'Subscription Plans', roles: ['ADMIN'] },
  { to: '/admin/recommendation-rules', label: 'Recommendation Rules', roles: ['ADMIN'] },
  { to: '/admin/analytics', label: 'Analytics', roles: ['ADMIN', 'SALES_MANAGER'] },
];

const ROLE_LABEL = {
  ADMIN: 'Admin',
  SALES_MANAGER: 'Sales Manager',
  FINANCE: 'Finance / Operations',
};

export default function AdminLayout() {
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await api.logout(token);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Admin Console</h2>
        <p style={{ fontSize: '0.75rem', color: '#9aa1b1', margin: '-0.5rem 0 1rem' }}>{ROLE_LABEL[role] || role}</p>
        <nav className="admin-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export function AdminIndexRedirect() {
  const { role } = useAuth();
  const first = NAV_ITEMS.find((item) => item.roles.includes(role));
  return <Navigate to={first ? first.to.replace('/admin/', '') : 'products'} replace />;
}
