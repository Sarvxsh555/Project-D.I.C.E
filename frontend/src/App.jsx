import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Portal from './pages/Portal.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import AdminLayout, { AdminIndexRedirect } from './pages/admin/AdminLayout.jsx';
import ApprovalQueue from './pages/admin/ApprovalQueue.jsx';
import ApprovalReview from './pages/admin/ApprovalReview.jsx';
import DealHealthDashboard from './pages/admin/DealHealthDashboard.jsx';
import Fulfillment from './pages/admin/Fulfillment.jsx';
import Billing from './pages/admin/Billing.jsx';
import Products from './pages/admin/Products.jsx';
import AdminCustomers from './pages/admin/Customers.jsx';
import PriceLists from './pages/admin/PriceLists.jsx';
import DiscountPolicies from './pages/admin/DiscountPolicies.jsx';
import Warehouses from './pages/admin/Warehouses.jsx';
import SubscriptionPlans from './pages/admin/SubscriptionPlans.jsx';
import RecommendationRules from './pages/admin/RecommendationRules.jsx';
import Analytics from './pages/admin/Analytics.jsx';
import Reports from './pages/admin/Reports.jsx';
import WorkspaceLayout from './pages/workspace/WorkspaceLayout.jsx';
import Quotations from './pages/workspace/Quotations.jsx';
import QuotationBuilder from './pages/workspace/QuotationBuilder.jsx';
import Pipeline from './pages/workspace/Pipeline.jsx';
import Customers from './pages/workspace/Customers.jsx';
import Tasks from './pages/workspace/Tasks.jsx';
import Notifications from './pages/workspace/Notifications.jsx';
import CustomerLayout from './pages/customer/CustomerLayout.jsx';
import CustomerDashboard from './pages/customer/CustomerDashboard.jsx';
import CustomerQuotations from './pages/customer/CustomerQuotations.jsx';
import CustomerQuotationDetail from './pages/customer/CustomerQuotationDetail.jsx';
import CustomerOrders from './pages/customer/CustomerOrders.jsx';
import CustomerOrderDetail from './pages/customer/CustomerOrderDetail.jsx';
import CustomerProfile from './pages/customer/CustomerProfile.jsx';
import ToastContainer from './components/ToastContainer.jsx';

function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer"
            element={
              <ProtectedRoute roles={['CUSTOMER']}>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="quotations" element={<CustomerQuotations />} />
            <Route path="quotations/:id" element={<CustomerQuotationDetail />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="orders/:id" element={<CustomerOrderDetail />} />
            <Route path="profile" element={<CustomerProfile />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN', 'SALES_MANAGER', 'FINANCE']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminIndexRedirect />} />
            <Route path="approvals" element={<ApprovalQueue />} />
            <Route path="approvals/:id" element={<ApprovalReview />} />
            <Route path="deal-health" element={<DealHealthDashboard />} />
            <Route path="fulfillment" element={<Fulfillment />} />
            <Route path="billing" element={<Billing />} />
            <Route path="products" element={<Products />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="price-lists" element={<PriceLists />} />
            <Route path="discount-policies" element={<DiscountPolicies />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="subscription-plans" element={<SubscriptionPlans />} />
            <Route path="recommendation-rules" element={<RecommendationRules />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          <Route
            path="/workspace"
            element={
              <ProtectedRoute roles={['SALES_REP']}>
                <WorkspaceLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="quotations" replace />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<QuotationBuilder />} />
            <Route path="quotations/:id" element={<QuotationBuilder />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="customers" element={<Customers />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
