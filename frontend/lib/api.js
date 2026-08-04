const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('libertine_token');
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('libertine_token', token);
  else localStorage.removeItem('libertine_token');
}

function getMediaToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('libertine_media_token');
}

export function setMediaToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('libertine_media_token', token);
  else localStorage.removeItem('libertine_media_token');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erreur réseau');
  }
  return data;
}

// Les photos/vidéos privées passent par une route authentifiée (voir
// backend /media/*) — une balise <img>/<video> ne peut pas envoyer d'en-tête
// Authorization, donc le jeton média (courte durée, distinct du token de
// session) est ajouté en paramètre d'URL.
export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const url = `${API_URL}${path}`;
  if (!path.startsWith('/media/')) return url;
  const mediaToken = getMediaToken();
  if (!mediaToken) return url;
  return `${url}?token=${encodeURIComponent(mediaToken)}`;
}

export { API_URL, getToken, getMediaToken };
