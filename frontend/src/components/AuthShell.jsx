export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-odoo-50 via-white to-odoo-100 px-4 py-12">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-odoo-300/30 blur-3xl -z-10" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-odoo-200/40 blur-3xl -z-10" />
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-odoo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-card">
            D
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-odoo-700">D.I.C.E.</span>
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-odooink mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  );
}

export function StatusMessage({ status }) {
  if (!status?.type) return null;
  const styles =
    status.type === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-green-50 text-green-700 border-green-200';
  return <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${styles}`}>{status.message}</p>;
}
