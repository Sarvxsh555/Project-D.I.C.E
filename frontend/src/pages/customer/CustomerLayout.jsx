import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { api } from '../../api.js';

const NAV = [
  { to: '/customer/dashboard', label: 'Dashboard' },
  { to: '/customer/quotations', label: 'Quotations' },
  { to: '/customer/orders', label: 'Orders' },
  { to: '/customer/profile', label: 'Profile' },
];

export default function CustomerLayout() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.logout(token);
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F6]">
      <header className="flex items-center justify-between gap-6 bg-white border-b border-black/5 px-6 py-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-odoo-600 text-white flex items-center justify-center font-extrabold text-sm">
            D
          </div>
          <span className="font-extrabold text-odoo-700 tracking-tight whitespace-nowrap">DealFlow360</span>
        </div>
        <nav className="flex flex-1 flex-wrap gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-odoo-50 text-odoo-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          <LogOut size={15} />
          Log out
        </button>
      </header>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}
