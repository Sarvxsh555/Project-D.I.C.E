import { useEffect, useState } from 'react';
import { initialNotifications } from './mockData.js';
import { useWorkspace } from './WorkspaceContext.jsx';

export default function Notifications() {
  const { reloadKey } = useWorkspace();
  const [items, setItems] = useState(initialNotifications);

  useEffect(() => {
    setItems(initialNotifications);
  }, [reloadKey]);

  const markRead = (id) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));

  return (
    <div>
      <h1>Notifications</h1>
      <p className="ws-subtitle">{items.filter((n) => n.unread).length} unread.</p>

      {items.map((n) => (
        <div
          className={`notif-row ${n.unread ? 'unread' : ''}`}
          key={n.id}
          onClick={() => markRead(n.id)}
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
