'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch } from '../../lib/api';
import { getChatSocket, identifyAsGuest, disconnectChatSocket } from '../../lib/chatSocket';
import AgeGate from '../../components/AgeGate';

const GENDER_LABELS = { HOMME: 'Homme', FEMME: 'Femme', TRANS: 'Trans', AUTRE: 'Non-genré' };
const GENDER_TEXT_COLORS = { HOMME: 'text-blue-600', FEMME: 'text-pink-600', TRANS: 'text-yellow-600', AUTRE: 'text-neutral-600' };
const GENDER_DOT_COLORS = { HOMME: 'bg-blue-500', FEMME: 'bg-pink-500', TRANS: 'bg-yellow-500', AUTRE: 'bg-neutral-400' };
const GENDER_ORDER = ['HOMME', 'FEMME', 'TRANS', 'AUTRE'];

export default function TchatPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [counts, setCounts] = useState({});
  const [department, setDepartment] = useState(null);
  const [guestPseudo, setGuestPseudo] = useState('');
  const [guestGender, setGuestGender] = useState('HOMME');
  const [identified, setIdentified] = useState(false);
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [text, setText] = useState('');
  const [banned, setBanned] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/chat/departments').then((d) => setDepartments(d.departments)).catch(() => {});
  }, []);

  // Connexion socket immédiate (observateur) dès l'arrivée sur la page,
  // pour afficher les compteurs par département avant même de rejoindre.
  useEffect(() => {
    const socket = getChatSocket();
    const onCounts = (c) => setCounts(c);
    const onIdentified = () => setIdentified(true);
    const onUsers = (u) => setRoomUsers(u);
    const onMessage = (msg) => setMessages((m) => [...m, msg]);
    const onBanned = () => setBanned(true);
    socket.on('chat:counts', onCounts);
    socket.on('chat:identified', onIdentified);
    socket.on('chat:users', onUsers);
    socket.on('chat:message', onMessage);
    socket.on('chat:banned', onBanned);
    return () => {
      socket.off('chat:counts', onCounts);
      socket.off('chat:identified', onIdentified);
      socket.off('chat:users', onUsers);
      socket.off('chat:message', onMessage);
      socket.off('chat:banned', onBanned);
    };
  }, []);

  useEffect(() => () => disconnectChatSocket(), []);

  const canJoin = user?.profile || identified;

  useEffect(() => {
    if (!department || !canJoin) return;
    apiFetch(`/api/chat/${department}/history`).then((d) => setMessages(d.messages)).catch(() => {});
    getChatSocket().emit('chat:join', department);
    setJoined(true);
    return () => {
      getChatSocket().emit('chat:leave');
      setJoined(false);
      setRoomUsers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, canJoin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submitGuestForm = (e) => {
    e.preventDefault();
    if (guestPseudo.trim().length < 2) return;
    identifyAsGuest(guestPseudo.trim(), guestGender);
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    getChatSocket().emit('chat:message', text);
    setText('');
  };

  const groupedUsers = GENDER_ORDER.map((g) => ({ gender: g, users: roomUsers.filter((u) => u.genderBucket === g) })).filter((g) => g.users.length > 0);

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
              className="card text-center py-3 hover:border-brand-500 transition relative">
              <p className="font-bold">{d.code}</p>
              <p className="text-xs text-neutral-500 truncate">{d.name}</p>
              {counts[d.code] > 0 && (
                <span className="absolute top-1 right-1 text-[10px] bg-green-100 text-green-700 rounded-full px-1.5">{counts[d.code]}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!canJoin) {
    return (
      <div className="max-w-sm mx-auto space-y-4">
        <button className="text-sm text-neutral-500" onClick={() => setDepartment(null)}>← Changer de département</button>
        <div className="card space-y-3">
          <h2 className="font-semibold">Rejoindre le salon {department}</h2>
          <p className="text-sm text-neutral-500">Entrez un pseudo et votre genre pour discuter sans créer de compte, ou connectez-vous.</p>
          <form onSubmit={submitGuestForm} className="space-y-2">
            <input className="input" placeholder="Votre pseudo" minLength={2} maxLength={30}
              value={guestPseudo} onChange={(e) => setGuestPseudo(e.target.value)} required />
            <select className="input" value={guestGender} onChange={(e) => setGuestGender(e.target.value)}>
              {GENDER_ORDER.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
            </select>
            <button className="btn-primary w-full">Rejoindre le tchat</button>
          </form>
        </div>
      </div>
    );
  }

  const dept = departments.find((d) => d.code === department);

  return (
    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 h-[70vh]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-neutral-200">
          <div>
            <h1 className="font-semibold">Salon {department} — {dept?.name}</h1>
            <p className="text-xs text-neutral-500">
              {user?.profile ? user.profile.pseudo : `${guestPseudo} (invité·e)`} · {roomUsers.length} connecté(s)
            </p>
          </div>
          <button className="btn-secondary text-xs" onClick={() => { setDepartment(null); setIdentified(false); }}>Changer</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className={`font-medium ${m.genderBucket ? GENDER_TEXT_COLORS[m.genderBucket] : 'text-brand-600'}`}>{m.authorName}</span>
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

      <div className="sm:w-48 shrink-0 border-t sm:border-t-0 sm:border-l border-neutral-200 pt-3 sm:pt-0 sm:pl-4 overflow-y-auto">
        <h2 className="text-xs font-semibold text-neutral-500 mb-2">Connectés ({roomUsers.length})</h2>
        <div className="space-y-3">
          {groupedUsers.map(({ gender, users }) => (
            <div key={gender}>
              <p className="text-[10px] uppercase text-neutral-400 mb-1">{GENDER_LABELS[gender]}</p>
              <div className="space-y-1">
                {users.map((u, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm">
                    <span className={`w-1.5 h-1.5 rounded-full ${GENDER_DOT_COLORS[gender]}`} />
                    <span className={GENDER_TEXT_COLORS[gender]}>{u.pseudo}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {roomUsers.length === 0 && <p className="text-xs text-neutral-400">Personne pour l'instant.</p>}
        </div>
      </div>
    </div>
  );
}
