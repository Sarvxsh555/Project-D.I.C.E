import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, initializing, role } = useAuth();

  if (initializing) return null;
  if (!isAuthenticated) return <Navigate to="/unauthorized" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

export default ProtectedRoute;
