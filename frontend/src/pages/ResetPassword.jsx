import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import AuthShell, { StatusMessage } from '../components/AuthShell.jsx';

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
    <AuthShell
      title="Reset password"
      subtitle={
        <>
          Choose a <span className="accent-script text-[1.3em]">fresh</span> password for your account.
        </>
      }
      footer={
        <Link to="/login" className="text-odoo-600 hover:text-odoo-700 font-medium">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="label">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Resetting...' : 'Reset password'}
        </button>

        <StatusMessage status={status} />
      </form>
    </AuthShell>
  );
}

export default ResetPassword;
