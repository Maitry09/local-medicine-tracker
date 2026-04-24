import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  console.log('🛡️ ProtectedRoute check:', { user, loading, allowedRoles, userRole: user?.role });

  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading, showing spinner');
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log('🚫 ProtectedRoute: User role not allowed, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('✅ ProtectedRoute: Access granted');
  return <Outlet />;
};

export default ProtectedRoute;
