'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';

const MAX_PHOTOS = 20;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [visible, setVisible] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setBio(user.profile?.bio || '');
    setCity(user.profile?.city || '');
    setVisible(user.profile?.visible ?? true);
    apiFetch('/api/photos/mine').then((d) => setPhotos(d.photos)).catch(() => {});
  }, [user]);

  if (!user) return null;

  const save = async () => {
    setError('');
    try {
      await apiFetch('/api/profiles/me', { method: 'PATCH', body: JSON.stringify({ bio, city, visible }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadPhoto = async (file) => {
    if (photos.length >= MAX_PHOTOS) return setError(`Maximum ${MAX_PHOTOS} photos.`);
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { photo } = await apiFetch('/api/photos', { method: 'POST', body: fd });
      setPhotos((p) => [...p, photo]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (id) => {
    await apiFetch(`/api/photos/${id}`, { method: 'DELETE' });
    setPhotos((p) => p.filter((ph) => ph.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-neutral-500">{user.profile?.pseudo} · {user.email}</p>
      </div>

      <section className="card space-y-4">
        <h2 className="font-semibold">Informations</h2>
        <div>
          <label className="text-sm text-neutral-400">Ville</label>
          <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-neutral-400">Bio</label>
          <textarea className="input" rows={4} maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Profil visible dans la recherche
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>Enregistrer</button>
          {saved && <span className="text-sm text-green-400">Enregistré</span>}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Photos ({photos.length}/{MAX_PHOTOS})</h2>
          <label className="btn-secondary text-sm cursor-pointer">
            {uploading ? 'Envoi...' : 'Ajouter une photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          Chaque photo est vérifiée par la modération avant d'apparaître publiquement.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800">
              <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
              <span className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${
                p.moderationStatus === 'APPROVED' ? 'bg-green-700' : p.moderationStatus === 'REJECTED' ? 'bg-red-700' : 'bg-yellow-700'
              }`}>
                {p.moderationStatus === 'APPROVED' ? 'validée' : p.moderationStatus === 'REJECTED' ? 'refusée' : 'en attente'}
              </span>
              <button onClick={() => deletePhoto(p.id)}
                className="absolute bottom-1 right-1 text-[10px] bg-black/70 rounded px-1.5 py-0.5 hover:bg-black">
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
