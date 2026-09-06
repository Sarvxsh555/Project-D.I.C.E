import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';

function Unauthorized() {
  return (
    <AuthShell title="Unauthorized" subtitle="You don't have permission to view this page.">
      <Link to="/login">
        <button type="button" className="btn-primary w-full">
          Go to sign in
        </button>
      </Link>
    </AuthShell>
  );
}

export default Unauthorized;
