import { useEffect, useState } from 'react';
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
      <h1>Notifications</h1>
      <p className="ws-subtitle">{items.filter((n) => n.unread).length} unread.</p>
      {items.length === 0 && <p>No notifications yet.</p>}
      {items.map((n) => (
        <div
          className={`notif-row ${n.unread ? 'unread' : ''}`}
          key={n.id}
          onClick={() => markRead(n.id, n.unread)}
          style={{ cursor: n.unread ? 'pointer' : 'default' }}
        >
          <span className="notif-icon">{n.icon}</span>
          <div className="notif-body">
            <div className="notif-title">{n.title}</div>
            <div className="notif-time">{n.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
