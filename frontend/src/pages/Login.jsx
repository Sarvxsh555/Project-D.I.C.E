import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import '../auth.css';

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
      navigate(payload.role === 'ADMIN' ? '/admin' : '/workspace');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div>
        {sessionExpired && (
          <p className="session-banner">Your session expired. Please sign in again.</p>
        )}
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Sign in</h1>

          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {status.type && <p className={`status ${status.type}`}>{status.message}</p>}

          <div className="auth-links">
            <Link to="/forgot-password">Forgot password?</Link>
            <span> · </span>
            <Link to="/signup">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
