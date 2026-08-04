'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const EMPTY_FORM = { id: null, slug: '', title: '', content: '', published: false };

export default function PagesTab() {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

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
        await apiFetch(`/api/admin/pages/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ slug: form.slug, title: form.title, content: form.content, published: form.published }),
        });
      } else {
        await apiFetch('/api/admin/pages', { method: 'POST', body: JSON.stringify(form) });
      }
      reset();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    await apiFetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
    load();
  };

  const togglePublish = async (page) => {
    await apiFetch(`/api/admin/pages/${page.id}`, { method: 'PATCH', body: JSON.stringify({ published: !page.published }) });
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
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary text-sm">{form.id ? 'Enregistrer' : 'Créer'}</button>
            {form.id && <button type="button" className="btn-secondary text-sm" onClick={reset}>Annuler</button>}
          </div>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold mb-2">Pages existantes</h2>
        {pages.map((p) => (
          <div key={p.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{p.title} <span className="text-xs text-neutral-500">/{p.slug}</span></p>
              <p className="text-xs text-neutral-500">{p.published ? 'Publiée' : 'Brouillon'}</p>
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
