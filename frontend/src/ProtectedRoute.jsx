import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/unauthorized" replace />;
}

export default ProtectedRoute;
