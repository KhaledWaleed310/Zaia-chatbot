import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        // Temporarily set user while validating
        setUser(JSON.parse(savedUser));
        // Validate token with backend - will clear user if invalid
        await refreshUser();
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await auth.me();
      const updatedUser = response.data;

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      // If user not found or token invalid, log them out
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        console.log('User session invalid, logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      return null;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await auth.login({ email, password });
      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return user;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed';
      setError(errorMessage);
      throw err;
    }
  };

  const register = async (email, password, company_name, company_size, industry, use_case, country, referral_source, privacy_consent, marketing_consent) => {
    try {
      setError(null);
      const response = await auth.register({
        email,
        password,
        company_name,
        company_size,
        industry,
        use_case,
        country,
        referral_source,
        privacy_consent,
        marketing_consent
      });
      // Don't auto-login - user must verify email first
      // Just return the response data without storing token
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
