'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { apiFetch, mediaUrl } from '../lib/api';
import { getSocket } from '../lib/socket';

// Fil de conversation d'un match, extrait en composant partagé : utilisé en
// page pleine (lien direct /messages/[conversationId], ex. depuis une
// notification de match) et dans le panneau droit de /messages (vue à deux
// colonnes).
export default function ConversationThread({ conversationId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [otherProfile, setOtherProfile] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user || !conversationId) return;
    setMessages([]);
    setOtherProfile(null);
    setSuggestions([]);
    apiFetch(`/api/messages/conversations/${conversationId}`).then((d) => {
      setMessages(d.messages);
      setOtherProfile(d.otherProfile);
      setDistanceKm(d.distanceKm);
    }).catch(() => {});

    const socket = getSocket();
    socket.emit('conversation:join', conversationId);
    const onNew = (msg) => {
      if (msg.conversationId === conversationId) setMessages((m) => [...m, msg]);
    };
    socket.on('message:new', onNew);
    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('message:new', onNew);
    };
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text;
    setText('');
    const { message } = await apiFetch(`/api/messages/conversations/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    setMessages((m) => (m.find((x) => x.id === message.id) ? m : [...m, message]));
    setSuggestions([]);
  };

  const suggest = async () => {
    setSuggesting(true);
    setSuggestError('');
    try {
      const { suggestions } = await apiFetch('/api/ai/conversation-suggestions', {
        method: 'POST',
        body: JSON.stringify({ conversationId }),
      });
      setSuggestions(suggestions);
    } catch (err) {
      setSuggestError(err.message);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {otherProfile && (
        <div className="flex items-center gap-3 pb-3 mb-1 border-b border-neutral-200">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 shrink-0">
            {otherProfile.photo && <img src={mediaUrl(otherProfile.photo)} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="font-medium">{otherProfile.pseudo}</p>
            <p className="text-xs text-neutral-500">
              {otherProfile.city}
              {distanceKm != null && ` · à ~${distanceKm} km`}
            </p>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {messages.map((m) => (
          <div key={m.id}
            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
              m.senderProfileId === user.profile.id ? 'bg-brand-500 text-white ml-auto' : 'bg-neutral-100 text-neutral-900'
            }`}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="pt-2 border-t border-neutral-200">
        <button type="button" onClick={suggest} disabled={suggesting}
          className="text-xs text-brand-500 hover:text-brand-600 disabled:opacity-50 mb-2">
          {suggesting ? 'Génération...' : '✨ Suggestions IA'}
        </button>
        {suggestError && <p className="text-xs text-red-600 mb-2">{suggestError}</p>}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => { setText(s); setSuggestions([]); }}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg px-3 py-1.5 text-left">
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={send} className="flex gap-2">
          <input className="input" placeholder="Votre message..." value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary">Envoyer</button>
        </form>
      </div>
    </div>
  );
}
