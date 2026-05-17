import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import api, { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(
    localStorage.getItem('accessToken') || localStorage.getItem('token')
  );

  const [loading, setLoading] = useState(true);

  // LOAD CURRENT USER
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await api.get('/auth/me');

        setUser(res.data.data.user);
      } catch (err) {
        console.log('Auth Error:', err);

        localStorage.removeItem('token');

        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // LOGIN
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({
        email,
        password
      });

      const data = response.data.data;

      // save token
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

      // update state
      setToken(data.accessToken);

      setUser(data.user);

      return data.user;
    } catch (error) {
      throw error;
    }
  };

  // REGISTER
  const register = async (payload) => {
    try {
      const response = await authAPI.register(payload);
      const data = response.data.data;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

      setToken(data.accessToken);
      setUser(data.user);

      return data.user;
    } catch (err) {
      throw err;
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// CUSTOM HOOK
export const useAuth = () => {
  return useContext(AuthContext);
};

export default useAuth;