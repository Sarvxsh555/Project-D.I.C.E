import { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { workspaceApi } from '../../workspaceApi.js';
import { useWorkspace } from './WorkspaceContext.jsx';

export default function Tasks() {
  const { token } = useAuth();
  const { reloadKey } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  const load = async () => {
    const data = await workspaceApi.tasks(token);
    setTasks(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (token) load();
  }, [token, reloadKey]);

  const toggleDone = async (id, done) => {
    await workspaceApi.patchTask(token, id, { done: !done });
    await load();
  };

  const add = async (e) => {
    e.preventDefault();
    await workspaceApi.createTask(token, { title, due: due || undefined });
    setTitle('');
    setDue('');
    await load();
  };

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <h1>Tasks</h1>
      <p className="ws-subtitle">
        {pending.length} open, {done.length} completed.
      </p>

      <form onSubmit={add} className="admin-toolbar" style={{ gap: 8 }}>
        <input required placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button type="submit">Add</button>
      </form>

      {tasks.length === 0 && <p>No tasks yet.</p>}
      {[...pending, ...done].map((t) => (
        <div className={`task-row ${t.done ? 'done' : ''}`} key={t.id}>
          <input type="checkbox" checked={!!t.done} onChange={() => toggleDone(t.id, t.done)} />
          <span className="task-title">{t.title}</span>
          {t.due && <span className="task-due">Due {t.due}</span>}
        </div>
      ))}
    </div>
  );
}
