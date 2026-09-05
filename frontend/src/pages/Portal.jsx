import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, UnauthorizedError } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import '../auth.css';

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
    <div className="auth-page">
      <div className="auth-card portal-card">
        <h1>Customer portal</h1>

        {error && <p className="status error">{error}</p>}

        {profile && (
          <dl>
            <dt>Username</dt>
            <dd>{profile.username}</dd>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
            <dt>Member since</dt>
            <dd>{new Date(profile.memberSince).toLocaleString()}</dd>
          </dl>
        )}

        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}

export default Portal;
