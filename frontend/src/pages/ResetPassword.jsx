import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import '../auth.css';

function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const data = await api.resetPassword({ token, newPassword });
      setStatus({ type: 'success', message: data.message });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Reset password</h1>

        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset password'}
        </button>

        {status.type && <p className={`status ${status.type}`}>{status.message}</p>}

        <div className="auth-links">
          <Link to="/login">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;
