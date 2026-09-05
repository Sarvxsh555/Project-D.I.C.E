import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { api, pingBackend } from '../../api.js';
import { workspaceApi } from '../../workspaceApi.js';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext.jsx';
import './workspace.css';

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
    <header className="ws-topnav">
      <div className="ws-brand">DealFlow360</div>
      <nav className="ws-nav-links">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
            {item.badgeKey === 'unread' && unread > 0 && <span className="ws-nav-badge">{unread}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="ws-actions">
        <button type="button" onClick={reload}>
          Reload Data
        </button>
        <button type="button" className="ws-backend-status" onClick={handleCheckBackend} disabled={checking}>
          <span
            className={`ws-dot ${backendStatus === 'online' ? 'online' : backendStatus === 'offline' ? 'offline' : ''}`}
          />
          {checking ? 'Checking...' : 'Backend'}
        </button>
        <button type="button" className="ws-profile" onClick={handleProfile}>
          Profile
        </button>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default function WorkspaceLayout() {
  return (
    <WorkspaceProvider>
      <div className="ws-shell">
        <TopNav />
        <main className="ws-main">
          <Outlet />
        </main>
      </div>
    </WorkspaceProvider>
  );
}
