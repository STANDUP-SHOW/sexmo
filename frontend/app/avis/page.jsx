'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch } from '../../lib/api';

export default function AvisPage() {
  const { user } = useAuth();
  const [testimonials, setTestimonials] = useState([]);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    apiFetch('/api/testimonials').then((d) => setTestimonials(d.testimonials)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!content.trim()) return;
    try {
      const { notice } = await apiFetch('/api/testimonials', {
        method: 'POST',
        body: JSON.stringify({ rating, content }),
      });
      setContent('');
      setNotice(notice);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Avis</h1>

      {user && (
        <form onSubmit={submit} className="card space-y-3">
          <h2 className="font-semibold">Laisser un avis</h2>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)}
                className={`text-xl ${n <= rating ? 'text-yellow-400' : 'text-neutral-700'}`}>★</button>
            ))}
          </div>
          <textarea className="input" rows={3} maxLength={1000} placeholder="Votre avis sur le site..."
            value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn-primary text-sm">Envoyer</button>
          {notice && <p className="text-xs text-green-600">{notice}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      <section className="space-y-3">
        {testimonials.map((t) => (
          <div key={t.id} className="card">
            <div className="text-yellow-400 text-sm">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
            <p className="text-sm text-neutral-800 mt-1">{t.content}</p>
            <p className="text-xs text-neutral-500 mt-1">{t.authorPseudo}</p>
            {t.adminReply && (
              <div className="bg-neutral-100 rounded-lg p-2 text-sm text-neutral-700 mt-2">
                <span className="font-medium">Réponse du site : </span>{t.adminReply}
              </div>
            )}
          </div>
        ))}
        {testimonials.length === 0 && <p className="text-sm text-neutral-500">Aucun avis pour l'instant.</p>}
      </section>
    </div>
  );
}
