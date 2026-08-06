'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'sexmo_search_location';
const DEFAULT_RADIUS = 50;

function readStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeStorage(city, radiusKm) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ city, radiusKm }));
}

// Ville + rayon de recherche partagés entre toutes les pages de parcours
// (parcourir, découvrir, galerie, lieux, ...) : un membre qui a réglé sa
// localisation dans son profil (ville et rayon) les retrouve pré-remplis ici
// par défaut ; un visiteur sans compte les règle une fois et ça reste tant
// qu'il navigue, via localStorage. Dans tous les cas, changeable librement
// sur chaque page.
export function useSearchLocation() {
  const { user } = useAuth();
  const [city, setCityState] = useState('');
  const [radiusKm, setRadiusKmState] = useState(DEFAULT_RADIUS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStorage();
    if (stored?.city) {
      setCityState(stored.city);
      setRadiusKmState(stored.radiusKm ?? DEFAULT_RADIUS);
    } else if (user?.profile?.city) {
      setCityState(user.profile.city);
      setRadiusKmState(user.profile.radiusKm || DEFAULT_RADIUS);
    }
    setReady(true);
    // Ne réagit qu'à la toute première résolution de l'utilisateur (évite
    // d'écraser un choix explicite fait entre-temps sur une autre page).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(user?.profile)]);

  // Persiste tout changement (ville ou rayon) pour les autres pages / le
  // prochain onglet — une fois l'état initial chargé, pour ne pas écraser
  // le localStorage avec les valeurs vides du tout premier rendu.
  useEffect(() => {
    if (ready) writeStorage(city, radiusKm);
  }, [ready, city, radiusKm]);

  const setCity = useCallback((newCity) => setCityState(newCity), []);
  const setRadiusKm = useCallback((newRadius) => setRadiusKmState(newRadius), []);

  return { city, radiusKm, setCity, setRadiusKm, ready };
}
