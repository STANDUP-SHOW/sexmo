'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, setToken, getToken, setMediaToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user, mediaToken } = await apiFetch('/api/auth/me');
      setMediaToken(mediaToken);
      setUser(user);
    } catch {
      setToken(null);
      setMediaToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Le jeton média expire au bout de 24h — le rafraîchir périodiquement pour
  // une session ouverte plus longtemps évite que les photos cessent de
  // charger sans que l'utilisateur ait besoin de se reconnecter.
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(data.token);
    setMediaToken(data.mediaToken);
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const data = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
    setToken(data.token);
    setMediaToken(data.mediaToken);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken(null);
    setMediaToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
