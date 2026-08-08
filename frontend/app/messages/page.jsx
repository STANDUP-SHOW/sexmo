'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';
import ConversationThread from '../../components/ConversationThread';

function MemberRow({ id, pseudo, city, photo, online, unread, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
        active ? 'bg-brand-50 border border-brand-200' : 'hover:bg-neutral-50'
      }`}>
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200">
          {photo && <img src={mediaUrl(photo)} alt="" className="w-full h-full object-cover" />}
        </div>
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-neutral-300'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${unread ? 'font-semibold' : 'font-medium'}`}>{pseudo}</p>
        <p className="text-xs text-neutral-500 truncate">{city}</p>
      </div>
      {unread && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
    </button>
  );
}

function CategorySection({ title, members, activeId, onSelect }) {
  if (members.length === 0) return null;
  const online = members.filter((m) => m.online);
  const offline = members.filter((m) => !m.online);
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide px-1">{title} ({members.length})</h3>
      {online.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10px] text-green-700 px-1">En ligne</p>
          {online.map((m) => (
            <MemberRow key={m.id} {...m} active={activeId === m.id} onClick={() => onSelect(m)} />
          ))}
        </div>
      )}
      {offline.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10px] text-neutral-400 px-1">Hors ligne</p>
          {offline.map((m) => (
            <MemberRow key={m.id} {...m} active={activeId === m.id} onClick={() => onSelect(m)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [likesReceived, setLikesReceived] = useState([]);
  const [photoLikers, setPhotoLikers] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const load = () => {
    apiFetch('/api/messages/conversations').then((d) => setConversations(d.conversations)).catch(() => {});
    apiFetch('/api/likes/received').then((d) => setLikesReceived(d.profiles)).catch(() => {});
    apiFetch('/api/likes/photo-likers').then((d) => setPhotoLikers(d.profiles)).catch(() => {});
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (!user) return null;

  const goTchat = (member) => {
    const url = member.department ? `/tchat?department=${member.department}&target=${member.id}` : '/tchat';
    router.push(url);
  };

  // Pour un membre qui vous a déjà aimé mais hors ligne : "envoyer un
  // message privé" passe par le like en retour (toujours via le mécanisme
  // like/match existant, jamais de message non sollicité) — comme il/elle
  // vous a aimé en premier, le match est immédiat et ouvre la conversation.
  const likeBackAndOpen = async (member) => {
    const res = await apiFetch(`/api/likes/${member.id}`, { method: 'POST' });
    if (res.matched) {
      setSelectedConversationId(res.conversationId);
      setNotice('');
      load();
    } else {
      setNotice("Une erreur est survenue, réessayez.");
    }
  };

  const amis = conversations.map((c) => ({
    id: c.otherProfile.id,
    pseudo: c.otherProfile.pseudo,
    city: c.otherProfile.city,
    photo: c.otherProfile.photo,
    online: c.otherProfile.online,
    department: c.otherProfile.department,
    unread: false,
    conversationId: c.conversationId,
  }));

  const selectAmi = (m) => {
    if (m.online) return goTchat(m);
    setSelectedConversationId(m.conversationId);
  };

  const selectLiker = (m) => {
    if (m.online) return goTchat(m);
    likeBackAndOpen(m);
  };

  const activeId = amis.find((a) => a.conversationId === selectedConversationId)?.id ?? null;

  // Sur mobile, une seule colonne à la fois (liste OU conversation), avec un
  // bouton retour — sinon les deux colonnes côte à côte débordent du
  // viewport. À partir de sm:, retour au layout à deux colonnes classique.
  return (
    <div className="h-[75vh] flex flex-col sm:flex-row gap-4">
      <div className={`w-full sm:w-72 shrink-0 border border-neutral-200 rounded-xl p-3 space-y-4 overflow-y-auto ${
        selectedConversationId ? 'hidden sm:block' : 'block'
      }`}>
        <h1 className="text-lg font-bold px-1">Messages</h1>
        {notice && <p className="text-xs text-red-600 px-1">{notice}</p>}
        <CategorySection title="Amis" members={amis} activeId={activeId} onSelect={selectAmi} />
        <CategorySection title="Il a aimé ma page" members={likesReceived} activeId={null} onSelect={selectLiker} />
        <CategorySection title="Il a aimé mes photos" members={photoLikers} activeId={null} onSelect={selectLiker} />
        {amis.length === 0 && likesReceived.length === 0 && photoLikers.length === 0 && (
          <p className="text-sm text-neutral-500 px-1">Aucun contact pour l'instant. Likez des profils pour matcher !</p>
        )}
      </div>

      <div className={`flex-1 border border-neutral-200 rounded-xl p-4 min-w-0 flex-col ${
        selectedConversationId ? 'flex' : 'hidden sm:flex'
      }`}>
        {selectedConversationId ? (
          <>
            <button type="button" onClick={() => setSelectedConversationId(null)}
              className="sm:hidden self-start mb-2 text-sm text-neutral-500 hover:text-brand-600 flex items-center gap-1">
              ← Retour aux messages
            </button>
            <div className="flex-1 min-h-0">
              <ConversationThread conversationId={selectedConversationId} />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-neutral-400">
            Sélectionnez un contact hors ligne pour ouvrir la conversation, ou un contact en ligne pour rejoindre le tchat direct.
          </div>
        )}
      </div>
    </div>
  );
}
