import { Outlet, Link } from 'react-router-dom'

// TODO: replace with real nav (role-aware, per docs/architecture.md) and
// pull the shell styling into components/common.
export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 border-b p-4">
        <Link to="/">Dashboard</Link>
        <Link to="/deals">Deals</Link>
        <Link to="/approvals">Approvals</Link>
        <Link to="/fulfillment">Fulfillment</Link>
        <Link to="/billing">Billing</Link>
        <Link to="/negotiations">Negotiations</Link>
        <Link to="/portal">Portal</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
