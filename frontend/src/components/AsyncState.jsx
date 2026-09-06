import { AlertTriangle, Loader2 } from 'lucide-react';

export default function AsyncState({ loading, error, empty, emptyMessage, emptyHint, onRetry, children }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="empty-state">
        <AlertTriangle className="mx-auto text-red-300 mb-2" size={36} />
        <p className="font-medium text-gray-500">{error}</p>
        {onRetry && (
          <button type="button" className="btn-secondary mt-3" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="empty-state">
        <p className="font-medium text-gray-500">{emptyMessage || 'Nothing here yet.'}</p>
        {emptyHint && <p className="text-xs text-gray-400 mt-0.5">{emptyHint}</p>}
      </div>
    );
  }
  return children;
}
