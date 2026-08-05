'use client';

import { useEffect, useState } from 'react';
import { apiFetch, mediaUrl } from '../../lib/api';

const EMPTY_FORM = { id: null, slug: '', title: '', content: '', published: false, images: [] };

export default function PagesTab() {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const load = () => {
    apiFetch('/api/admin/pages').then((d) => setPages(d.pages)).catch(() => {});
  };

  useEffect(load, []);

  const edit = (page) => setForm({ ...page });
  const reset = () => setForm(EMPTY_FORM);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form.id) {
        const { page } = await apiFetch(`/api/admin/pages/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ slug: form.slug, title: form.title, content: form.content, published: form.published }),
        });
        setForm({ ...page });
      } else {
        const { page } = await apiFetch('/api/admin/pages', { method: 'POST', body: JSON.stringify(form) });
        setForm({ ...page });
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    await apiFetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
    if (form.id === id) reset();
    load();
  };

  const togglePublish = async (page) => {
    await apiFetch(`/api/admin/pages/${page.id}`, { method: 'PATCH', body: JSON.stringify({ published: !page.published }) });
    load();
  };

  const uploadImages = async (files) => {
    if (!form.id || files.length === 0) return;
    setUploadingImages(true);
    try {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('images', f));
      const { page } = await apiFetch(`/api/admin/pages/${form.id}/images`, { method: 'POST', body: fd });
      setForm({ ...page });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = async (url) => {
    const images = form.images.filter((i) => i !== url);
    const { page } = await apiFetch(`/api/admin/pages/${form.id}`, { method: 'PATCH', body: JSON.stringify({ images }) });
    setForm({ ...page });
    load();
  };

  return (
    <div className="space-y-8">
      <section className="card space-y-3">
        <h2 className="font-semibold">{form.id ? 'Modifier la page' : 'Nouvelle page'}</h2>
        <form onSubmit={save} className="space-y-3">
          <div className="flex gap-3">
            <input className="input" placeholder="Titre" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input className="input" placeholder="slug-de-la-page" value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </div>
          <textarea className="input" rows={6} placeholder="Contenu..." value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Publiée
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary text-sm">{form.id ? 'Enregistrer' : 'Créer'}</button>
            {form.id && <button type="button" className="btn-secondary text-sm" onClick={reset}>Nouvelle page</button>}
          </div>
        </form>

        {form.id && (
          <div className="pt-3 border-t border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Galerie de la page ({form.images.length})</h3>
              <label className="btn-secondary text-xs cursor-pointer">
                {uploadingImages ? 'Envoi...' : 'Ajouter des photos'}
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={uploadingImages}
                  onChange={(e) => { uploadImages(e.target.files); e.target.value = ''; }} />
              </label>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {form.images.map((url) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200">
                  <img src={mediaUrl(url)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(url)}
                    className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5 hover:bg-black">
                    Suppr.
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold mb-2">Pages existantes</h2>
        {pages.map((p) => (
          <div key={p.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{p.title} <span className="text-xs text-neutral-500">/{p.slug}</span></p>
              <p className="text-xs text-neutral-500">{p.published ? 'Publiée' : 'Brouillon'}{p.images?.length > 0 ? ` · ${p.images.length} photo(s)` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" onClick={() => togglePublish(p)}>
                {p.published ? 'Dépublier' : 'Publier'}
              </button>
              <button className="btn-secondary text-xs" onClick={() => edit(p)}>Modifier</button>
              <button className="btn-secondary text-xs" onClick={() => remove(p.id)}>Supprimer</button>
            </div>
          </div>
        ))}
        {pages.length === 0 && <p className="text-neutral-500 text-sm">Aucune page pour l'instant.</p>}
      </section>
    </div>
  );
}
