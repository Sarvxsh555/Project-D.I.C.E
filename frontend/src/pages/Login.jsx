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
        <div className="demo-accounts">
          <p>Demo logins</p>
          <button type="button" onClick={() => { setUsername('manager'); setPassword('Manager@1234'); }}>Sales Manager — manager</button>
          <button type="button" onClick={() => { setUsername('finance'); setPassword('Finance@1234'); }}>Finance — finance</button>
          <button type="button" onClick={() => { setUsername('testuser'); setPassword('Test@1234'); }}>Sales Rep — testuser</button>
          <button type="button" onClick={() => { setUsername('acme'); setPassword('Acme@1234'); }}>Acme Corp — acme</button>
          <button type="button" onClick={() => { setUsername('globex'); setPassword('Globex@1234'); }}>Globex — globex</button>
          <button type="button" onClick={() => { setUsername('initech'); setPassword('Initech@1234'); }}>Initech — initech</button>
          <button type="button" onClick={() => { setUsername('umbrella'); setPassword('Umbrella@1234'); }}>Umbrella — umbrella</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
