'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from './api';

const DEFAULTS = { siteName: 'LibertineConnect', tagline: '', logoUrl: null };

const SettingsContext = createContext(DEFAULTS);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);

  const refresh = useCallback(() => {
    apiFetch('/api/settings').then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (settings.siteName) document.title = settings.siteName;
  }, [settings.siteName]);

  return <SettingsContext.Provider value={{ ...settings, refresh }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
