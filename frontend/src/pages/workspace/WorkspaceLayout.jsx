import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext.jsx';
import { api, pingBackend } from '../../api.js';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext.jsx';
import { UNREAD_NOTIFICATION_COUNT } from './mockData.js';
import './workspace.css';

const NAV_ITEMS = [
  { to: '/workspace/quotations', label: 'Quotations' },
  { to: '/workspace/pipeline', label: 'Pipeline' },
  { to: '/workspace/customers', label: 'Customers' },
  { to: '/workspace/tasks', label: 'Tasks' },
  { to: '/workspace/notifications', label: 'Notifications', badge: UNREAD_NOTIFICATION_COUNT },
];

function TopNav() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { reload } = useWorkspace();
  const [backendStatus, setBackendStatus] = useState(null); // null | 'online' | 'offline'
  const [checking, setChecking] = useState(false);

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
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {item.label}
            {Boolean(item.badge) && <span className="ws-nav-badge">{item.badge}</span>}
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
