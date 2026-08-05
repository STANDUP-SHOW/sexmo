'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '../../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../../lib/api';

export default function CmsPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [page, setPage] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    apiFetch(`/api/pages/${slug}`).then((d) => {
      setPage(d.page);
      setComments(d.comments);
    }).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { notice } = await apiFetch(`/api/pages/${slug}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText }),
      });
      setCommentText('');
      setNotice(notice);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!page) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">{page.title}</h1>
        <div className="text-neutral-800 whitespace-pre-line">{page.content}</div>
      </div>

      {page.images?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {page.images.map((url) => (
            <div key={url} className="aspect-square rounded-lg overflow-hidden bg-neutral-200">
              <img src={mediaUrl(url)} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-semibold">Commentaires</h2>
        {comments.map((c) => (
          <div key={c.id} className="card">
            <p className="text-sm text-neutral-800">{c.content}</p>
            <p className="text-xs text-neutral-500 mt-1">{c.authorPseudo}</p>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-neutral-500">Aucun commentaire pour l'instant.</p>}

        {user ? (
          <form onSubmit={submitComment} className="space-y-2">
            <textarea className="input" rows={3} maxLength={1000} placeholder="Votre commentaire..."
              value={commentText} onChange={(e) => setCommentText(e.target.value)} />
            <button className="btn-primary text-sm">Envoyer</button>
            {notice && <p className="text-xs text-green-600">{notice}</p>}
          </form>
        ) : (
          <p className="text-sm text-neutral-500">Connectez-vous pour laisser un commentaire.</p>
        )}
      </section>
    </div>
  );
}
