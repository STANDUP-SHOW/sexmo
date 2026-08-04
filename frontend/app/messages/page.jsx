'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/messages/conversations').then((d) => setConversations(d.conversations)).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="space-y-2">
        {conversations.map((c) => (
          <Link key={c.conversationId} href={`/messages/${c.conversationId}`}
            className="card flex items-center gap-3 hover:border-brand-600 transition">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 shrink-0">
              {c.otherProfile.photo && <img src={mediaUrl(c.otherProfile.photo)} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="font-medium">
                {c.otherProfile.pseudo}
                {c.distanceKm != null && <span className="text-xs text-neutral-500 font-normal"> · à ~{c.distanceKm} km</span>}
              </p>
              <p className="text-xs text-neutral-500 truncate">{c.lastMessage?.content || 'Dites bonjour !'}</p>
            </div>
          </Link>
        ))}
        {conversations.length === 0 && <p className="text-neutral-500">Aucune conversation pour l'instant. Likez des profils pour matcher !</p>}
      </div>
    </div>
  );
}
