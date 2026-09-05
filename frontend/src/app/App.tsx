import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import AppLayout from '../layouts/AppLayout'
import PortalLayout from '../layouts/PortalLayout'
import { RequireRole } from '../components/common/RequireRole'

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
        {/* Public Stakeholder Auth Routes */}
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

        {/* Internal Staff App Layout with Strict Stakeholder RBAC */}
        <Route element={<AppLayout />}>
          {/* Dashboard Hub (Role-Tailored Operational Views) */}
          <Route
            path="/"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN']}>
                <DashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN']}>
                <DashboardPage />
              </RequireRole>
            }
          />

          {/* Quotations & Deals: Sales Rep, Sales Manager, Admin */}
          <Route
            path="/quotations"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ADMIN']}>
                <QuotationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/quotations/:id"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ADMIN']}>
                <QuotationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/deals"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ADMIN']}>
                <QuotationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/deals/:id"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ADMIN']}>
                <QuotationsPage />
              </RequireRole>
            }
          />

          {/* Approvals: Sales Manager, Finance, Admin */}
          <Route
            path="/approvals"
            element={
              <RequireRole allowedRoles={['SALES_MANAGER', 'FINANCE', 'ADMIN']}>
                <ApprovalsPage />
              </RequireRole>
            }
          />
          <Route
            path="/approvals/:id"
            element={
              <RequireRole allowedRoles={['SALES_MANAGER', 'FINANCE', 'ADMIN']}>
                <ApprovalsPage />
              </RequireRole>
            }
          />

          {/* Fulfillment & WMS: Operations, Admin */}
          <Route
            path="/fulfillment"
            element={
              <RequireRole allowedRoles={['OPERATIONS', 'ADMIN']}>
                <FulfillmentPage />
              </RequireRole>
            }
          />
          <Route
            path="/fulfillment/:id"
            element={
              <RequireRole allowedRoles={['OPERATIONS', 'ADMIN']}>
                <FulfillmentPage />
              </RequireRole>
            }
          />

          {/* Billing & Subscriptions: Finance, Admin */}
          <Route
            path="/billing"
            element={
              <RequireRole allowedRoles={['FINANCE', 'ADMIN']}>
                <BillingPage />
              </RequireRole>
            }
          />
          <Route
            path="/billing/subscriptions"
            element={
              <RequireRole allowedRoles={['FINANCE', 'ADMIN']}>
                <BillingPage />
              </RequireRole>
            }
          />
          <Route
            path="/billing/:id"
            element={
              <RequireRole allowedRoles={['FINANCE', 'ADMIN']}>
                <BillingPage />
              </RequireRole>
            }
          />

          {/* Negotiations: Sales Rep, Sales Manager, Admin */}
          <Route
            path="/negotiations"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ADMIN']}>
                <NegotiationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/negotiations/:id"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ADMIN']}>
                <NegotiationsPage />
              </RequireRole>
            }
          />

          {/* Invoices: Finance, Admin */}
          <Route
            path="/invoices"
            element={
              <RequireRole allowedRoles={['FINANCE', 'ADMIN']}>
                <InvoicesPage />
              </RequireRole>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <RequireRole allowedRoles={['FINANCE', 'ADMIN']}>
                <InvoicesPage />
              </RequireRole>
            }
          />

          {/* Deal Health: Sales Rep, Sales Manager, Finance, Admin */}
          <Route
            path="/deal-health"
            element={
              <RequireRole allowedRoles={['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN']}>
                <DealHealthPage />
              </RequireRole>
            }
          />

          {/* Admin & Master Governance: Admin Only */}
          <Route
            path="/admin"
            element={
              <RequireRole allowedRoles={['ADMIN']}>
                <AdminPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/products"
            element={
              <RequireRole allowedRoles={['ADMIN']}>
                <AdminPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/pricelists"
            element={
              <RequireRole allowedRoles={['ADMIN']}>
                <AdminPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/discount-rules"
            element={
              <RequireRole allowedRoles={['ADMIN']}>
                <AdminPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/reporting"
            element={
              <RequireRole allowedRoles={['ADMIN']}>
                <AdminPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProviders>
  )
}

export default App

