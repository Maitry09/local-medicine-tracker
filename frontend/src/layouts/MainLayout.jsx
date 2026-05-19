import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';

const MainLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const closeMenu = () => setMobileNavOpen(false);
  const toggleMenu = () => setMobileNavOpen((prev) => !prev);

  const handleLogout = async () => {
    try {
      const userName = user?.name || 'User';
      await logout();
      showNotification(`👋 Goodbye, ${userName}! Logged out successfully.`, 'success', 3000);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('❌ Error logging out. Please try again.', 'error', 3000);
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'pharmacy':
        return '/pharmacy/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo" onClick={closeMenu}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
            </svg>
            MediFind
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-controls="primary-navigation"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={toggleMenu}
          >
            {mobileNavOpen ? '✕' : '☰'}
          </button>

          <nav id="primary-navigation" className={`nav ${mobileNavOpen ? 'nav-open' : ''}`}>
            <Link to="/search" className="nav-link">Search Medicines</Link>
            <Link to="/pharmacies" className="nav-link">Pharmacies</Link>
            
            {user ? (
              <>
                <Link to="/cart" className="nav-link" style={{ position: 'relative' }} onClick={closeMenu}>
                  Cart
                  {getItemCount() > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-12px',
                      background: 'var(--danger)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getItemCount()}
                    </span>
                  )}
                </Link>
                <Link to={getDashboardLink()} className="nav-link" onClick={closeMenu}>Dashboard</Link>
                <button
                  onClick={async () => {
                    closeMenu();
                    await handleLogout();
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline btn-sm" onClick={closeMenu}>Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer style={{
        backgroundColor: 'var(--gray-900)',
        color: 'var(--gray-400)',
        padding: '2rem 1rem',
        marginTop: '3rem'
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
            <div>
              <h4 style={{ color: 'var(--white)', marginBottom: '1rem' }}>MediFind</h4>
              <p style={{ maxWidth: '300px' }}>
                Find nearby pharmacies with specific medicines in stock - right now.
              </p>
            </div>
            <div>
              <h5 style={{ color: 'var(--white)', marginBottom: '0.75rem' }}>Quick Links</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link to="/search" style={{ color: 'var(--gray-400)' }}>Search Medicines</Link>
                <Link to="/pharmacies" style={{ color: 'var(--gray-400)' }}>Find Pharmacies</Link>
              </div>
            </div>
            <div>
              <h5 style={{ color: 'var(--white)', marginBottom: '0.75rem' }}>Contact</h5>
              <p>support@medifind.com</p>
              <p>+91 1234567890</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--gray-700)', marginTop: '2rem', paddingTop: '1rem', textAlign: 'center' }}>
            <p>&copy; 2024 MediFind. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
