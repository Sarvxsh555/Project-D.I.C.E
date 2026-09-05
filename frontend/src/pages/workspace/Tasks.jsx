import { useEffect, useState } from 'react';
import { initialTasks } from './mockData.js';
import { useWorkspace } from './WorkspaceContext.jsx';

export default function Tasks() {
  const { reloadKey } = useWorkspace();
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    setTasks(initialTasks);
  }, [reloadKey]);

  const toggleDone = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <h1>Tasks</h1>
      <p className="ws-subtitle">
        {pending.length} open, {done.length} completed.
      </p>

      {[...pending, ...done].map((t) => (
        <div className={`task-row ${t.done ? 'done' : ''}`} key={t.id}>
          <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} />
          <span className="task-title">{t.title}</span>
          <span className="task-due">Due {t.due}</span>
        </div>
      ))}
    </div>
  );
}
