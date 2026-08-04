'use client';

import { useEffect, useState } from 'react';
import { apiFetch, mediaUrl } from '../../lib/api';
import { useSettings } from '../../lib/SettingsContext';

export default function SettingsTab() {
  const { refresh } = useSettings();
  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    apiFetch('/api/settings').then((d) => {
      setSiteName(d.siteName);
      setTagline(d.tagline);
      setLogoUrl(d.logoUrl);
    }).catch(() => {});
  };

  useEffect(load, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/admin/settings', { method: 'PATCH', body: JSON.stringify({ siteName, tagline }) });
      refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadLogo = async (file) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const { settings } = await apiFetch('/api/admin/settings/logo', { method: 'POST', body: fd });
      setLogoUrl(settings.logoUrl);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="card space-y-4 max-w-lg">
      <h2 className="font-semibold">Personnalisation du site</h2>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden flex items-center justify-center">
          {logoUrl ? <img src={mediaUrl(logoUrl)} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-neutral-600">Logo</span>}
        </div>
        <label className="btn-secondary text-sm cursor-pointer">
          {uploading ? 'Envoi...' : 'Changer le logo'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])} />
        </label>
      </div>

      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="text-sm text-neutral-400">Nom du site</label>
          <input className="input" maxLength={60} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-neutral-400">Slogan (affiché en page d'accueil)</label>
          <input className="input" maxLength={200} value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button className="btn-primary text-sm">Enregistrer</button>
          {saved && <span className="text-sm text-green-600">Enregistré</span>}
        </div>
      </form>
    </section>
  );
}
