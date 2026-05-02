import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize from localStorage synchronously so no blank flash
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }

<<<<<<< HEAD
    // Silently verify token in background
    authAPI.getMe()
      .then(res => {
        const freshUser = res.data.data.user;
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      })
      .catch(err => {
        if (err.response?.status === 401) {
=======
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');

      console.log('🔍 Checking auth:', { hasToken: !!token, hasSavedUser: !!savedUser });

      // No token at all — not logged in, done
      if (!token || !savedUser) {
        console.log('❌ No token or saved user, setting loading to false');
        setLoading(false);
        return;
      }

      // Restore from localStorage immediately so UI doesn't flash blank
      const parsedUser = JSON.parse(savedUser);
      console.log('✅ Restoring user from localStorage:', parsedUser);
      setUser(parsedUser);

      // Silently verify token is still valid in background
      try {
        const response = await authAPI.getMe();
        const freshUser = response.data.data.user;
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      } catch (verifyError) {
        // Only clear session on explicit 401 (expired/invalid token)
        // Don't clear on network errors or server errors (502, 503 etc.)
        if (verifyError.response?.status === 401) {
>>>>>>> 7928981f7cd32b1b5fdaca113a3eea08909ad7ca
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
<<<<<<< HEAD
      })
      .finally(() => setLoading(false));
  }, []);
=======
        // Otherwise keep the localStorage user — offline or server issue
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };
>>>>>>> 7928981f7cd32b1b5fdaca113a3eea08909ad7ca

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user, accessToken, refreshToken } = response.data.data;
<<<<<<< HEAD
=======

    console.log('✅ Login successful, user:', user);
    console.log('🔑 Tokens received:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });

>>>>>>> 7928981f7cd32b1b5fdaca113a3eea08909ad7ca
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
<<<<<<< HEAD
    return user;
=======
    console.log('👤 User state set to:', user);
    return user; // Return user directly, not wrapped in success/error
>>>>>>> 7928981f7cd32b1b5fdaca113a3eea08909ad7ca
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { user, accessToken, refreshToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout, updateUser,
      isAuthenticated: !!user,
      isPatient: user?.role === 'patient',
      isPharmacy: user?.role === 'pharmacy',
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};
