'use client';

import { useEffect, useState } from 'react';
import { apiFetch, mediaUrl } from '../../lib/api';

export default function GalleriesTab() {
  const [galleries, setGalleries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetch('/api/admin/galleries').then((d) => setGalleries(d.galleries)).catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const createGallery = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await apiFetch('/api/admin/galleries', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) });
      setNewName('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeGallery = async (id) => {
    if (!confirm('Supprimer cette galerie et toutes ses photos ?')) return;
    await apiFetch(`/api/admin/galleries/${id}`, { method: 'DELETE' });
    load();
  };

  if (selectedId) {
    return <GalleryDetail id={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Galeries ({galleries.length})</h2>

      <form onSubmit={createGallery} className="flex gap-2">
        <input className="input" placeholder="Nom de la nouvelle galerie (ex. Soirée sexmo Lyon)"
          value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary shrink-0">Créer</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {galleries.map((g) => (
          <div key={g.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{g.name}</p>
              <p className="text-xs text-neutral-500">{g._count.photos} photo(s) · créée le {new Date(g.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" onClick={() => setSelectedId(g.id)}>Ouvrir</button>
              <button className="btn-secondary text-xs text-red-600" onClick={() => removeGallery(g.id)}>Supprimer</button>
            </div>
          </div>
        ))}
        {galleries.length === 0 && <p className="text-neutral-500 text-sm">Aucune galerie pour l'instant.</p>}
      </div>
    </section>
  );
}

const SORT_OPTIONS = { date: 'Date', genre: 'Genre', pseudo: 'Pseudo', ville: 'Ville' };

function GalleryDetail({ id, onBack }) {
  const [photos, setPhotos] = useState([]);
  const [sort, setSort] = useState('date');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = (sortKey = sort) => {
    apiFetch(`/api/admin/galleries/${id}/photos?sort=${sortKey}`).then((d) => setPhotos(d.photos)).catch((e) => setError(e.message));
  };

  useEffect(() => load(sort), [id, sort]);

  const uploadBatch = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('photos', f));
      const { notice: n } = await apiFetch(`/api/admin/galleries/${id}/photos/batch`, { method: 'POST', body: fd });
      setNotice(n);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photoId) => {
    await apiFetch(`/api/admin/galleries/${id}/photos/${photoId}`, { method: 'DELETE' });
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
  };

  return (
    <section className="space-y-4">
      <button className="btn-secondary text-sm" onClick={onBack}>← Retour aux galeries</button>

      <div className="card space-y-3">
        <h2 className="font-semibold">Import en masse</h2>
        <p className="text-sm text-neutral-500">
          Nommez chaque fichier <code>pseudo-genre-ville-date.jpg</code> (date au format <code>AAAAMMJJ</code>, sans tiret
          interne — ex. <code>Julie-Femme-Lyon-20260615.jpg</code>). Le pseudo, le genre, la ville et la date sont extraits
          automatiquement et affichés sur chaque vignette.
        </p>
        <div className="flex gap-2">
          <label className="btn-secondary text-sm cursor-pointer">
            {uploading ? 'Envoi...' : 'Choisir des photos'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              disabled={uploading}
              onChange={(e) => { uploadBatch(e.target.files); e.target.value = ''; }} />
          </label>
          <label className="btn-secondary text-sm cursor-pointer">
            Importer un dossier
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple webkitdirectory="" directory="" className="hidden"
              disabled={uploading}
              onChange={(e) => { uploadBatch(e.target.files); e.target.value = ''; }} />
          </label>
        </div>
        {notice && <p className="text-sm text-green-600">{notice}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Photos ({photos.length})</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">Trier par</label>
          <select className="input w-36" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORT_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200">
            <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] p-1.5 space-y-0.5">
              <p className="font-medium truncate">{p.authorPseudo}</p>
              <p className="text-neutral-300 truncate">{[p.genre, p.ville].filter(Boolean).join(' · ') || '—'}</p>
              <p className="text-neutral-400">{new Date(p.publishedAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <button onClick={() => removePhoto(p.id)}
              className="absolute top-1 right-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5 hover:bg-black">
              Suppr.
            </button>
          </div>
        ))}
        {photos.length === 0 && <p className="text-neutral-500 text-sm col-span-full">Aucune photo dans cette galerie.</p>}
      </div>
    </section>
  );
}
