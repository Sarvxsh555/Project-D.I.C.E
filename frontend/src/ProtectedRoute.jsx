import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) return null;
  return isAuthenticated ? children : <Navigate to="/unauthorized" replace />;
}

export default ProtectedRoute;
