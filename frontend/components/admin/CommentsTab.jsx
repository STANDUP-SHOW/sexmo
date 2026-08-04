'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

export default function CommentsTab() {
  const [comments, setComments] = useState([]);

  const load = () => {
    apiFetch('/api/admin/comments/pending').then((d) => setComments(d.comments)).catch(() => {});
  };

  useEffect(load, []);

  const moderate = async (id, status) => {
    await apiFetch(`/api/admin/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setComments((c) => c.filter((x) => x.id !== id));
  };

  const remove = async (id) => {
    await apiFetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    setComments((c) => c.filter((x) => x.id !== id));
  };

  return (
    <section className="space-y-3">
      <h2 className="font-semibold mb-2">Commentaires en attente</h2>
      {comments.map((c) => (
        <div key={c.id} className="card">
          <p className="text-sm text-neutral-200">{c.content}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {c.authorUser.email} · sur "{c.page.title}"
          </p>
          <div className="flex gap-2 mt-3">
            <button className="btn-primary text-xs" onClick={() => moderate(c.id, 'APPROVED')}>Valider</button>
            <button className="btn-secondary text-xs" onClick={() => moderate(c.id, 'REJECTED')}>Refuser</button>
            <button className="btn-secondary text-xs" onClick={() => remove(c.id)}>Supprimer</button>
          </div>
        </div>
      ))}
      {comments.length === 0 && <p className="text-neutral-500 text-sm">Aucun commentaire en attente.</p>}
    </section>
  );
}
