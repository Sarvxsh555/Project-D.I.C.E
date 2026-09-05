import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';
import './admin.css';

const NAV_ITEMS = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/price-lists', label: 'Price Lists' },
  { to: '/admin/discount-policies', label: 'Discount Policies' },
  { to: '/admin/warehouses', label: 'Warehouses' },
  { to: '/admin/subscription-plans', label: 'Subscription Plans' },
  { to: '/admin/recommendation-rules', label: 'Recommendation Rules' },
  { to: '/admin/analytics', label: 'Analytics' },
];

export default function AdminLayout() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

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
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
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
