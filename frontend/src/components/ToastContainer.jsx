import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToasts } from '../toast.js';

const STYLES = {
  error: { icon: AlertCircle, classes: 'bg-red-50 border-red-200 text-red-700' },
  success: { icon: CheckCircle2, classes: 'bg-green-50 border-green-200 text-green-700' },
  info: { icon: Info, classes: 'bg-odoo-50 border-odoo-200 text-odoo-700' },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => dismiss(toast.id), 6000);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => {
        const { icon: Icon, classes } = STYLES[t.type] || STYLES.info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-popover text-sm ${classes}`}
          >
            <Icon size={18} className="mt-0.5 flex-shrink-0" />
            <p className="flex-1">{t.message}</p>
            <button type="button" className="opacity-60 hover:opacity-100" onClick={() => dismiss(t.id)}>
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
