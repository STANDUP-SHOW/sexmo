'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';
import { getCroppedImageBlob } from '../../lib/cropImage';
import PhotoCropModal from '../../components/PhotoCropModal';

const MAX_PHOTOS = 20;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [visible, setVisible] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [cropSrc, setCropSrc] = useState(null);
  const [quality, setQuality] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const refreshQuality = () => {
    apiFetch('/api/profiles/me/quality').then(setQuality).catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    setBio(user.profile?.bio || '');
    setCity(user.profile?.city || '');
    setInterestsText((user.profile?.interests || []).join(', '));
    setVisible(user.profile?.visible ?? true);
    apiFetch('/api/photos/mine').then((d) => setPhotos(d.photos)).catch(() => {});
    refreshQuality();
  }, [user]);

  if (!user) return null;

  const save = async () => {
    setError('');
    try {
      const interests = interestsText.split(',').map((s) => s.trim()).filter(Boolean);
      await apiFetch('/api/profiles/me', { method: 'PATCH', body: JSON.stringify({ bio, city, visible, interests }) });
      setSaved(true);
      refreshQuality();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadPhoto = async (blob) => {
    if (photos.length >= MAX_PHOTOS) return setError(`Maximum ${MAX_PHOTOS} photos.`);
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', blob, 'photo.jpg');
      const { photo } = await apiFetch('/api/photos', { method: 'POST', body: fd });
      setPhotos((p) => [...p, photo]);
      refreshQuality();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (file) => {
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const confirmCrop = async (croppedAreaPixels) => {
    const blob = await getCroppedImageBlob(cropSrc, croppedAreaPixels);
    closeCrop();
    await uploadPhoto(blob);
  };

  const deletePhoto = async (id) => {
    await apiFetch(`/api/photos/${id}`, { method: 'DELETE' });
    setPhotos((p) => p.filter((ph) => ph.id !== id));
    refreshQuality();
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
        <div>
          <label className="text-sm text-neutral-400">Centres d'intérêt (séparés par des virgules)</label>
          <input className="input" placeholder="cinéma, voyages, cuisine..."
            value={interestsText} onChange={(e) => setInterestsText(e.target.value)} />
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

      {quality && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Qualité du profil</h2>
            <span className="text-sm text-neutral-400">{quality.score} / {quality.maxScore}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full bg-brand-600" style={{ width: `${(quality.score / quality.maxScore) * 100}%` }} />
          </div>
          {quality.suggestions.length > 0 ? (
            <ul className="text-sm text-neutral-400 list-disc list-inside space-y-1">
              {quality.suggestions.map((s) => <li key={s}>{s}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-green-400">Profil complet, bravo !</p>
          )}
        </section>
      )}

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Photos ({photos.length}/{MAX_PHOTOS})</h2>
          <label className="btn-secondary text-sm cursor-pointer">
            {uploading ? 'Envoi...' : 'Ajouter une photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              disabled={uploading}
              onChange={(e) => { onFileSelected(e.target.files[0]); e.target.value = ''; }} />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          Chaque photo est recadrée avant envoi, puis vérifiée par la modération avant d'apparaître publiquement.
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

      {cropSrc && (
        <PhotoCropModal imageSrc={cropSrc} onCancel={closeCrop} onConfirm={confirmCrop} />
      )}
    </div>
  );
}
