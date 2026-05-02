import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const patientLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/orders', label: 'My Orders', icon: '📦' },
    { path: '/alerts', label: 'My Alerts', icon: '🔔' },
    { path: '/search', label: 'Search Medicines', icon: '🔍' }
  ];

  const pharmacyLinks = [
    { path: '/pharmacy/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/pharmacy/analytics', label: 'Analytics', icon: '📈' },
    { path: '/pharmacy/stock', label: 'Manage Stock', icon: '💊' },
    { path: '/pharmacy/orders', label: 'Orders', icon: '📦' },
    { path: '/pharmacy/profile', label: 'Pharmacy Profile', icon: '🏪' }
  ];

  const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Manage Users', icon: '👥' },
    { path: '/admin/pharmacies', label: 'Manage Pharmacies', icon: '🏥' },
    { path: '/admin/medicines', label: 'Manage Medicines', icon: '💊' },
    { path: '/admin/orders', label: 'All Orders', icon: '📦' }
  ];

  const getLinks = () => {
    switch (user?.role) {
      case 'admin':
        return adminLinks;
      case 'pharmacy':
        return pharmacyLinks;
      default:
        return patientLinks;
    }
  };

  const links = getLinks();

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
            </svg>
            MediFind
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="text-muted text-sm">
              {user?.name} ({user?.role})
            </span>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex' }}>
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
