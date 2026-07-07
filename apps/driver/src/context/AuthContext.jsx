// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ncemds_driver_token');
    if (!token) { setIsLoading(false); return; }
    getCurrentUser()
      .then(setUser)
      .catch(() => localStorage.removeItem('ncemds_driver_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const loginUser = useCallback((userData) => {
    localStorage.setItem('ncemds_driver_token', userData.token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ncemds_driver_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
