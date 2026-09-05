import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import AuthShell, { StatusMessage } from '../components/AuthShell.jsx';

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
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="text-odoo-600 hover:text-odoo-700 font-medium">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <StatusMessage status={status} />
      </form>
    </AuthShell>
  );
}

export default ForgotPassword;
