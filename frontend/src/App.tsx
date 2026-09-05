import { Routes, Route } from 'react-router-dom'
import DashboardPage from './pages/dashboard/DashboardPage'
import DealsPage from './pages/deals/DealsPage'
import ApprovalsPage from './pages/approvals/ApprovalsPage'
import FulfillmentPage from './pages/fulfillment/FulfillmentPage'
import BillingPage from './pages/billing/BillingPage'
import NegotiationsPage from './pages/negotiations/NegotiationsPage'
import PortalPage from './pages/portal/PortalPage'
import AdminPage from './pages/admin/AdminPage'
import AppLayout from './layouts/AppLayout'

// TODO: wrap protected routes with an auth guard once services/api.ts issues
// and stores a real bearer token (see backend AuthController).
function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/deals/*" element={<DealsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/fulfillment" element={<FulfillmentPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/negotiations/*" element={<NegotiationsPage />} />
        <Route path="/portal/*" element={<PortalPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}

export default App
