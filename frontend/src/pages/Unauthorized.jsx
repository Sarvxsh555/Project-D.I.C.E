import { Link } from 'react-router-dom';
import '../auth.css';

function Unauthorized() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Unauthorized</h1>
        <p className="subtitle">You need to sign in to view this page.</p>
        <Link to="/login">
          <button type="button" style={{ width: '100%' }}>
            Go to sign in
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Unauthorized;
