'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

const STATUS_LABELS = { PENDING: 'en attente', APPROVED: 'validé', REJECTED: 'refusé' };
const STATUS_COLORS = { PENDING: 'bg-yellow-600 text-white', APPROVED: 'bg-green-700 text-white', REJECTED: 'bg-red-700 text-white' };

export default function TestimonialsTab() {
  const [testimonials, setTestimonials] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    apiFetch('/api/admin/testimonials').then((d) => setTestimonials(d.testimonials)).catch(() => {});
  };

  useEffect(load, []);

  const moderate = async (id, status) => {
    const { testimonial } = await apiFetch(`/api/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setTestimonials((t) => t.map((x) => (x.id === id ? testimonial : x)));
  };

  const sendReply = async (id) => {
    const adminReply = replyDrafts[id] ?? '';
    const { testimonial } = await apiFetch(`/api/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify({ adminReply: adminReply || null }) });
    setTestimonials((t) => t.map((x) => (x.id === id ? testimonial : x)));
  };

  const remove = async (id) => {
    await apiFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    setTestimonials((t) => t.filter((x) => x.id !== id));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Avis ({testimonials.length})</h2>
        <button className="btn-primary text-sm" onClick={() => setShowAdd(true)}>Ajouter un avis</button>
      </div>

      <div className="space-y-3">
        {testimonials.map((t) => (
          <div key={t.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-yellow-400 text-sm">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
            </div>
            <p className="text-sm text-neutral-800">{t.content}</p>
            <p className="text-xs text-neutral-500">{t.authorUser.profile?.pseudo || t.authorUser.email}</p>

            {t.adminReply != null && (
              <div className="bg-neutral-100 rounded-lg p-2 text-sm text-neutral-700">
                <span className="font-medium">Réponse du site : </span>{t.adminReply}
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center pt-1">
              {t.status !== 'APPROVED' && <button className="btn-primary text-xs" onClick={() => moderate(t.id, 'APPROVED')}>Valider</button>}
              {t.status !== 'REJECTED' && <button className="btn-secondary text-xs" onClick={() => moderate(t.id, 'REJECTED')}>Refuser</button>}
              <button className="btn-secondary text-xs" onClick={() => remove(t.id)}>Supprimer</button>
            </div>

            <div className="flex gap-2 pt-1">
              <input className="input text-sm" placeholder="Répondre publiquement..."
                defaultValue={t.adminReply || ''}
                onChange={(e) => setReplyDrafts((d) => ({ ...d, [t.id]: e.target.value }))} />
              <button className="btn-secondary text-xs shrink-0" onClick={() => sendReply(t.id)}>Répondre</button>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && <p className="text-neutral-500 text-sm">Aucun avis pour l'instant.</p>}
      </div>

      {showAdd && <AddTestimonialModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} />}
    </section>
  );
}

function AddTestimonialModal({ onClose, onCreated }) {
  const [authorEmail, setAuthorEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiFetch('/api/admin/testimonials', { method: 'POST', body: JSON.stringify({ authorEmail, rating, content }) });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
      <form onSubmit={submit} className="card max-w-md w-full space-y-3">
        <h3 className="font-semibold">Ajouter un avis</h3>
        <p className="text-xs text-neutral-500">L'avis doit être rattaché à un membre déjà inscrit (recherché par e-mail).</p>
        <input required type="email" className="input" placeholder="E-mail du membre" value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)} />
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)}
              className={`text-xl ${n <= rating ? 'text-yellow-400' : 'text-neutral-300'}`}>★</button>
          ))}
        </div>
        <textarea required className="input" rows={3} maxLength={1000} placeholder="Contenu de l'avis"
          value={content} onChange={(e) => setContent(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Envoi...' : 'Publier'}</button>
        </div>
      </form>
    </div>
  );
}
