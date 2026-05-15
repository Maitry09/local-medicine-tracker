import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading, token } = useAuth();

  const location = useLocation();

  // Loading
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Not logged in
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Wrong role
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <h1>403 - Access Denied</h1>

        <p>
          You do not have permission to access this page.
        </p>

        <button
          className="btn btn-primary"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;