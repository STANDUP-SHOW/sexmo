'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch } from '../../lib/api';
import { getChatSocket, disconnectChatSocket } from '../../lib/chatSocket';
import AgeGate from '../../components/AgeGate';

export default function TchatPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState(null);
  const [guestPseudo, setGuestPseudo] = useState('');
  const [pseudoConfirmed, setPseudoConfirmed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [banned, setBanned] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/chat/departments').then((d) => setDepartments(d.departments)).catch(() => {});
  }, []);

  const canEnter = user?.profile || pseudoConfirmed;

  useEffect(() => {
    if (!department || !canEnter) return;

    apiFetch(`/api/chat/${department}/history`).then((d) => setMessages(d.messages)).catch(() => {});

    const socket = getChatSocket(user?.profile ? undefined : guestPseudo);
    socket.emit('chat:join', department);
    const onMessage = (msg) => setMessages((m) => [...m, msg]);
    const onBanned = () => setBanned(true);
    socket.on('chat:message', onMessage);
    socket.on('chat:banned', onBanned);

    return () => {
      socket.emit('chat:leave');
      socket.off('chat:message', onMessage);
      socket.off('chat:banned', onBanned);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, canEnter]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => disconnectChatSocket(), []);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    getChatSocket().emit('chat:message', text);
    setText('');
  };

  if (banned) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-red-600">Vous avez été exclu·e du tchat par la modération.</p>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="max-w-2xl mx-auto">
        <AgeGate />
        <h1 className="text-2xl font-bold mb-1">Sexmo Tchat</h1>
        <p className="text-sm text-neutral-500 mb-6">Choisissez votre département pour rejoindre le salon d'échange.</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {departments.map((d) => (
            <button key={d.code} onClick={() => setDepartment(d.code)}
              className="card text-center py-3 hover:border-brand-500 transition">
              <p className="font-bold">{d.code}</p>
              <p className="text-xs text-neutral-500 truncate">{d.name}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!canEnter) {
    return (
      <div className="max-w-sm mx-auto space-y-4">
        <button className="text-sm text-neutral-500" onClick={() => setDepartment(null)}>← Changer de département</button>
        <div className="card space-y-3">
          <h2 className="font-semibold">Rejoindre le salon {department}</h2>
          <p className="text-sm text-neutral-500">Entrez un pseudo pour discuter sans créer de compte, ou connectez-vous.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (guestPseudo.trim().length >= 2) setPseudoConfirmed(true); }} className="space-y-2">
            <input className="input" placeholder="Votre pseudo" minLength={2} maxLength={30}
              value={guestPseudo} onChange={(e) => setGuestPseudo(e.target.value)} required />
            <button className="btn-primary w-full">Rejoindre le tchat</button>
          </form>
        </div>
      </div>
    );
  }

  const dept = departments.find((d) => d.code === department);

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[70vh]">
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-neutral-200">
        <div>
          <h1 className="font-semibold">Salon {department} — {dept?.name}</h1>
          <p className="text-xs text-neutral-500">{user?.profile ? user.profile.pseudo : `${guestPseudo} (invité·e)`}</p>
        </div>
        <button className="btn-secondary text-xs" onClick={() => { setDepartment(null); setPseudoConfirmed(false); }}>Changer</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 py-2">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className={`font-medium ${m.isGuest ? 'text-neutral-500' : 'text-brand-600'}`}>{m.authorName}</span>
            <span className="text-neutral-800"> : {m.content}</span>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-neutral-500">Aucun message pour l'instant, lancez la discussion !</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-2 border-t border-neutral-200">
        <input className="input" placeholder="Votre message..." maxLength={500}
          value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-primary">Envoyer</button>
      </form>
    </div>
  );
}
