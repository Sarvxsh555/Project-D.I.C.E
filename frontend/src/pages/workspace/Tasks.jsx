import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
      <h1 className="page-title">Tasks</h1>
      <p className="page-subtitle">
        {pending.length} open, {done.length} completed.
      </p>

      <form onSubmit={add} className="panel mb-5 flex flex-wrap gap-3">
        <input required className="input flex-1 min-w-[200px]" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input w-auto" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button type="submit" className="btn-primary">
          <Plus size={16} />
          Add
        </button>
      </form>

      {tasks.length === 0 && <p className="empty-state">No tasks yet.</p>}
      <div className="space-y-2">
        {[...pending, ...done].map((t) => (
          <div className="card flex items-center gap-3 px-4 py-3" key={t.id}>
            <input type="checkbox" className="h-4 w-4 accent-odoo-600" checked={!!t.done} onChange={() => toggleDone(t.id, t.done)} />
            <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : 'text-odooink'}`}>{t.title}</span>
            {t.due && <span className="text-xs text-gray-500">Due {t.due}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
