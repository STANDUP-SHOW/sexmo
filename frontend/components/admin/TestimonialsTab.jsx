'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function TestimonialsTab() {
  const [testimonials, setTestimonials] = useState([]);

  const load = () => {
    apiFetch('/api/admin/testimonials/pending').then((d) => setTestimonials(d.testimonials)).catch(() => {});
  };

  useEffect(load, []);

  const moderate = async (id, status) => {
    await apiFetch(`/api/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setTestimonials((t) => t.filter((x) => x.id !== id));
  };

  const remove = async (id) => {
    await apiFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    setTestimonials((t) => t.filter((x) => x.id !== id));
  };

  return (
    <section className="space-y-3">
      <h2 className="font-semibold mb-2">Avis en attente</h2>
      {testimonials.map((t) => (
        <div key={t.id} className="card">
          <div className="text-yellow-400 text-sm">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
          <p className="text-sm text-neutral-200 mt-1">{t.content}</p>
          <p className="text-xs text-neutral-500 mt-1">{t.authorUser.email}</p>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary text-xs" onClick={() => moderate(t.id, 'APPROVED')}>Valider</button>
            <button className="btn-secondary text-xs" onClick={() => moderate(t.id, 'REJECTED')}>Refuser</button>
            <button className="btn-secondary text-xs" onClick={() => remove(t.id)}>Supprimer</button>
          </div>
        </div>
      ))}
      {testimonials.length === 0 && <p className="text-neutral-500 text-sm">Aucun avis en attente.</p>}
    </section>
  );
}
