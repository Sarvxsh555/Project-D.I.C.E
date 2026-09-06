import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckSquare,
  Truck,
  Receipt,
  Package,
  Users,
  Tags,
  Percent,
  Warehouse,
  RefreshCw,
  Sparkles,
  BarChart3,
  FileBarChart,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';

// Each nav item lists the roles that power it, per the RBAC table: Admin owns platform
// config; Sales Manager owns discount policy + deal health; Finance owns fulfillment,
// billing and the second approval step; all three share the approval queue.
const NAV_ITEMS = [
  { to: '/admin/deal-health', label: 'Deal Health', icon: Activity, roles: ['ADMIN', 'SALES_MANAGER'] },
  { to: '/admin/approvals', label: 'Approvals', icon: CheckSquare, roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
  { to: '/admin/fulfillment', label: 'Fulfillment', icon: Truck, roles: ['ADMIN', 'FINANCE'] },
  { to: '/admin/billing', label: 'Billing', icon: Receipt, roles: ['ADMIN', 'FINANCE'] },
  { to: '/admin/products', label: 'Products', icon: Package, roles: ['ADMIN'] },
  { to: '/admin/customers', label: 'Customers', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/price-lists', label: 'Price Lists', icon: Tags, roles: ['ADMIN'] },
  { to: '/admin/discount-policies', label: 'Discount Policies', icon: Percent, roles: ['ADMIN', 'SALES_MANAGER'] },
  { to: '/admin/warehouses', label: 'Warehouses', icon: Warehouse, roles: ['ADMIN'] },
  { to: '/admin/subscription-plans', label: 'Subscription Plans', icon: RefreshCw, roles: ['ADMIN'] },
  { to: '/admin/recommendation-rules', label: 'Recommendation Rules', icon: Sparkles, roles: ['ADMIN'] },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'SALES_MANAGER'] },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart, roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
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
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F7F5F6]">
      <aside className="w-64 flex-shrink-0 bg-white border-r border-black/5 flex flex-col py-5">
        <div className="flex items-center gap-2 px-5 mb-1">
          <div className="h-8 w-8 rounded-lg bg-odoo-600 text-white flex items-center justify-center font-extrabold text-sm">
            D
          </div>
          <span className="font-extrabold text-odoo-700 tracking-tight">
            Admin <span className="accent-script text-[1.3em] align-middle">Console</span>
          </span>
        </div>
        <p className="text-xs text-gray-400 px-5 mb-4">{ROLE_LABEL[role] || role}</p>
        <nav className="flex flex-col gap-0.5 px-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-odoo-50 text-odoo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-odooink'
                  }`
                }
              >
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto px-3 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-8">
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
