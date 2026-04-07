import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const roleDashboardMap = {
  restaurant: '/restaurant/dashboard',
  ngo: '/ngo/dashboard',
  animal_husbandry: '/animal/dashboard',
  industry: '/industry/dashboard',
  admin: '/admin/dashboard'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('foodbridge_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.data);
      } catch (error) {
        localStorage.removeItem('foodbridge_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [token]);

  const persistSession = (payload) => {
    const nextToken = payload.token;
    localStorage.setItem('foodbridge_token', nextToken);
    setToken(nextToken);
    setUser(payload.user);
  };

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    persistSession(response.data.data);
    return response.data.data;
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    persistSession(response.data.data);
    return response.data.data;
  };

  const logout = () => {
    localStorage.removeItem('foodbridge_token');
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
        roleDashboardMap
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

