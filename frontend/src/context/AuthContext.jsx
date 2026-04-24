import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

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
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
        // Otherwise keep the localStorage user — offline or server issue
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Returns the user object on success, throws on failure
  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user, accessToken, refreshToken } = response.data.data;

    console.log('✅ Login successful, user:', user);
    console.log('🔑 Tokens received:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    console.log('👤 User state set to:', user);
    return user; // Return user directly, not wrapped in success/error
  };

  // Returns the user object on success, throws on failure
  const register = async (userData) => {
    console.log('📝 Attempting registration with:', userData);
    try {
      const response = await authAPI.register(userData);
      console.log('✅ Registration response:', response.data);
      const { user, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);
      return user; // Return user directly, not wrapped in success/error
    } catch (error) {
      console.error('❌ Registration failed:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
        error: error.message
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🛑 Logging out user...');
      await authAPI.logout();
      console.log('✅ Logout API call successful');
    } catch (error) {
      console.error('⚠️ Logout error (continuing with local logout):', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      console.log('✅ User logged out successfully');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isPatient: user?.role === 'patient',
    isPharmacy: user?.role === 'pharmacy',
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};