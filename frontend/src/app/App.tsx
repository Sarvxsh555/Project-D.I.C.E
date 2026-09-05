import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import AppLayout from '../layouts/AppLayout'
import PortalLayout from '../layouts/PortalLayout'

import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/auth/SignupPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import QuotationsPage from '../pages/quotations/QuotationsPage'
import ApprovalsPage from '../pages/approvals/ApprovalsPage'
import FulfillmentPage from '../pages/fulfillment/FulfillmentPage'
import BillingPage from '../pages/billing/BillingPage'
import NegotiationsPage from '../pages/negotiations/NegotiationsPage'
import InvoicesPage from '../pages/invoices/InvoicesPage'
import DealHealthPage from '../pages/health/DealHealthPage'
import AdminPage from '../pages/admin/AdminPage'
import PortalPage from '../pages/portal/PortalPage'

export function App() {
  return (
    <AppProviders>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Customer Portal Isolated Experience */}
        <Route
          path="/portal"
          element={
            <PortalLayout>
              <PortalPage />
            </PortalLayout>
          }
        />
        <Route
          path="/portal/quotes/:token"
          element={
            <PortalLayout>
              <PortalPage />
            </PortalLayout>
          }
        />
        <Route
          path="/portal/quotes/:token/negotiate"
          element={
            <PortalLayout>
              <PortalPage />
            </PortalLayout>
          }
        />
        <Route
          path="/portal/*"
          element={
            <PortalLayout>
              <PortalPage />
            </PortalLayout>
          }
        />

        {/* Internal Staff App Layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/quotations/:id" element={<QuotationsPage />} />
          <Route path="/deals" element={<QuotationsPage />} />
          <Route path="/deals/:id" element={<QuotationsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/approvals/:id" element={<ApprovalsPage />} />
          <Route path="/fulfillment" element={<FulfillmentPage />} />
          <Route path="/fulfillment/:id" element={<FulfillmentPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/billing/subscriptions" element={<BillingPage />} />
          <Route path="/billing/:id" element={<BillingPage />} />
          <Route path="/negotiations" element={<NegotiationsPage />} />
          <Route path="/negotiations/:id" element={<NegotiationsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoicesPage />} />
          <Route path="/deal-health" element={<DealHealthPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/products" element={<AdminPage />} />
          <Route path="/admin/pricelists" element={<AdminPage />} />
          <Route path="/admin/discount-rules" element={<AdminPage />} />
          <Route path="/admin/reporting" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProviders>
  )
}

export default App
