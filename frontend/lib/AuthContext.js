'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, setToken, getToken, setMediaToken, getMediaToken } from './api';

const AuthContext = createContext(null);

// Session admin mise de côté pendant une impersonation ("se connecter en
// tant que ce membre"), pour pouvoir revenir sans se reconnecter.
const RETURN_TOKEN_KEY = 'sexmo_admin_return_token';
const RETURN_MEDIA_TOKEN_KEY = 'sexmo_admin_return_media_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setImpersonating(!!sessionStorage.getItem(RETURN_TOKEN_KEY));
    }
  }, []);

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
    sessionStorage.removeItem(RETURN_TOKEN_KEY);
    sessionStorage.removeItem(RETURN_MEDIA_TOKEN_KEY);
    setImpersonating(false);
    setToken(null);
    setMediaToken(null);
    setUser(null);
  };

  const impersonate = (data) => {
    sessionStorage.setItem(RETURN_TOKEN_KEY, getToken() || '');
    sessionStorage.setItem(RETURN_MEDIA_TOKEN_KEY, getMediaToken() || '');
    setImpersonating(true);
    setToken(data.token);
    setMediaToken(data.mediaToken);
    setUser(data.user);
  };

  const stopImpersonating = async () => {
    const returnToken = sessionStorage.getItem(RETURN_TOKEN_KEY);
    const returnMediaToken = sessionStorage.getItem(RETURN_MEDIA_TOKEN_KEY);
    sessionStorage.removeItem(RETURN_TOKEN_KEY);
    sessionStorage.removeItem(RETURN_MEDIA_TOKEN_KEY);
    setImpersonating(false);
    if (returnToken) {
      setToken(returnToken);
      setMediaToken(returnMediaToken);
      await refresh();
    } else {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, impersonating, login, signup, logout, refresh, impersonate, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
