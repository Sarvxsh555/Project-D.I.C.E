import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, UnauthorizedError } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import AuthShell, { StatusMessage } from '../components/AuthShell.jsx';

function Portal() {
  const { token, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .me(token)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          logout();
          navigate('/unauthorized');
        } else {
          setError(err.message);
        }
      });
  }, [token, logout, navigate]);

  const handleLogout = async () => {
    try {
      await api.logout(token);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <AuthShell
      title={
        <>
          Customer <span className="accent-script text-[1.3em]">portal</span>
        </>
      }
    >
      <StatusMessage status={error ? { type: 'error', message: error } : null} />

      {profile && (
        <dl className="space-y-3 mb-6">
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Username</dt>
            <dd className="text-odooink font-medium">{profile.username}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</dt>
            <dd className="text-odooink font-medium">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Member since</dt>
            <dd className="text-odooink font-medium">{new Date(profile.memberSince).toLocaleString()}</dd>
          </div>
        </dl>
      )}

      <button type="button" className="btn-primary w-full" onClick={handleLogout}>
        Log out
      </button>
    </AuthShell>
  );
}

export default Portal;
