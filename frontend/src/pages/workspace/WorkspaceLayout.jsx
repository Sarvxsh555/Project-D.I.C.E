import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { RotateCw, User, LogOut } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { api, pingBackend } from '../../api.js';
import { workspaceApi } from '../../workspaceApi.js';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext.jsx';

const NAV = [
  { to: '/workspace/quotations', label: 'Quotations' },
  { to: '/workspace/pipeline', label: 'Pipeline' },
  { to: '/workspace/customers', label: 'Customers' },
  { to: '/workspace/tasks', label: 'Tasks' },
  { to: '/workspace/notifications', label: 'Notifications', badgeKey: 'unread' },
];

function TopNav() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { reload, reloadKey } = useWorkspace();
  const [backendStatus, setBackendStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    workspaceApi.unreadCount(token).then((d) => setUnread(d.count || 0)).catch(() => setUnread(0));
  }, [token, reloadKey]);

  const handleCheckBackend = async () => {
    setChecking(true);
    const ok = await pingBackend();
    setBackendStatus(ok ? 'online' : 'offline');
    setChecking(false);
  };

  const handleProfile = () => navigate('/portal');

  const handleLogout = async () => {
    try {
      await api.logout(token);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
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
              `relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-odoo-50 text-odoo-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            {item.label}
            {item.badgeKey === 'unread' && unread > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-pill bg-red-600 text-white text-[11px] font-bold px-1.5 py-0.5">
                {unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary" onClick={reload}>
          <RotateCw size={15} />
          Reload
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleCheckBackend}
          disabled={checking}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              backendStatus === 'online' ? 'bg-green-500' : backendStatus === 'offline' ? 'bg-red-500' : 'bg-gray-300'
            }`}
          />
          {checking ? 'Checking...' : 'Backend'}
        </button>
        <button type="button" className="btn-secondary" onClick={handleProfile}>
          <User size={15} />
          Profile
        </button>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </header>
  );
}

export default function WorkspaceLayout() {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-[#F7F5F6]">
        <TopNav />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </WorkspaceProvider>
  );
}
