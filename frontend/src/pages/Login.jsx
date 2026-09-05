import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import AuthShell, { StatusMessage } from '../components/AuthShell.jsx';
import PasswordField from '../components/PasswordField.jsx';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(false);
  const { login, sessionExpired, dismissSessionExpired } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });
    dismissSessionExpired();

    try {
      const data = await api.login({ username, password });
      login(data.accessToken);
      const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
      if (payload.role === 'CUSTOMER') navigate('/customer-portal');
      else if (payload.role === 'SALES_REP') navigate('/workspace');
      else navigate('/admin'); // ADMIN, SALES_MANAGER, FINANCE all land in the admin console
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle={
        <>
          Welcome <span className="accent-script text-[1.3em]">back</span>. Enter your details to continue.
        </>
      }
      footer={
        <>
          <Link to="/forgot-password" className="text-odoo-600 hover:text-odoo-700 font-medium">
            Forgot password?
          </Link>
          <span className="mx-2 text-gray-300">·</span>
          <Link to="/signup" className="text-odoo-600 hover:text-odoo-700 font-medium">
            Create an account
          </Link>
        </>
      }
    >
      {sessionExpired && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Your session expired. Please sign in again.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="label">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <PasswordField
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <StatusMessage status={status} />
      </form>
    </AuthShell>
  );
}

export default Login;
