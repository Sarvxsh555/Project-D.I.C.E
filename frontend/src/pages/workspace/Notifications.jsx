import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../AuthContext.jsx';
import { workspaceApi } from '../../workspaceApi.js';
import { useWorkspace } from './WorkspaceContext.jsx';

export default function Notifications() {
  const { token } = useAuth();
  const { reloadKey } = useWorkspace();
  const [items, setItems] = useState([]);

  const load = async () => {
    const data = await workspaceApi.notifications(token);
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (token) load();
  }, [token, reloadKey]);

  const markRead = async (id, unread) => {
    if (!unread) return;
    await workspaceApi.markNotificationRead(token, id);
    await load();
  };

  return (
    <div>
      <h1 className="page-title flex items-center gap-2.5">
        <span className="rounded-lg bg-odoo-50 text-odoo-600 p-1.5">
          <Bell size={20} />
        </span>
        Notifications
      </h1>
      <p className="page-subtitle">{items.filter((n) => n.unread).length} unread.</p>
      {items.length === 0 && (
        <div className="empty-state">
          <Bell className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="font-medium text-gray-500">No notifications yet.</p>
          <p className="text-xs text-gray-400 mt-0.5">You're all caught up.</p>
        </div>
      )}
      <div className="space-y-2">
        {items.map((n) => (
          <div
            className={`card flex gap-3 px-4 py-3.5 items-start ${n.unread ? 'border-l-4 border-l-odoo-600' : ''} ${n.unread ? 'cursor-pointer' : ''}`}
            key={n.id}
            onClick={() => markRead(n.id, n.unread)}
          >
            <span className="text-lg leading-none">{n.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-odooink">{n.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
