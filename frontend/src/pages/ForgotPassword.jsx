import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import '../auth.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const data = await api.forgotPassword({ email });
      setStatus({ type: 'success', message: data.message });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Forgot password</h1>
        <p className="subtitle">Enter your email and we'll send you a reset link.</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        {status.type && <p className={`status ${status.type}`}>{status.message}</p>}

        <div className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;
