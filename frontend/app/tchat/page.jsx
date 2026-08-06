'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';
import { getChatSocket, identifyAsGuest, disconnectChatSocket } from '../../lib/chatSocket';
import { EXPERIENCE_LEVEL_EMOJI } from '../../lib/enums';
import AgeGate from '../../components/AgeGate';
import LogoMark from '../../components/LogoMark';

const GENDER_LABELS = { HOMME: 'Homme', FEMME: 'Femme', TRANS: 'Trans', AUTRE: 'Non-genré' };
const GENDER_TEXT_COLORS = { HOMME: 'text-blue-600', FEMME: 'text-pink-600', TRANS: 'text-yellow-600', AUTRE: 'text-neutral-600' };
const GENDER_DOT_COLORS = { HOMME: 'bg-blue-500', FEMME: 'bg-pink-500', TRANS: 'bg-yellow-500', AUTRE: 'bg-neutral-400' };
const GENDER_ORDER = ['HOMME', 'FEMME', 'TRANS', 'AUTRE'];
const MAX_PRIVATE_THREADS = 25;

function PeerIcon({ peer }) {
  if (!peer.isMember) return null;
  if (peer.experienceLevel) return <span title={peer.experienceLevel}>{EXPERIENCE_LEVEL_EMOJI[peer.experienceLevel]}</span>;
  return <span title="Membre sexmo"><LogoMark className="h-3.5 w-3.5 inline-block align-middle" /></span>;
}

export default function TchatPage() {
  return (
    <Suspense fallback={null}>
      <TchatPageInner />
    </Suspense>
  );
}

function TchatPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const targetProfileId = searchParams.get('target');
  const [departments, setDepartments] = useState([]);
  const [counts, setCounts] = useState({});
  const [department, setDepartment] = useState(searchParams.get('department') || null);
  const [guestPseudo, setGuestPseudo] = useState('');
  const [guestGender, setGuestGender] = useState('HOMME');
  const [identified, setIdentified] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [text, setText] = useState('');
  const [banned, setBanned] = useState(false);
  const [threads, setThreads] = useState([]); // {threadId, peer, messages, unread}
  const [activeThreadId, setActiveThreadId] = useState(null); // null = salon public
  const [limitNotice, setLimitNotice] = useState('');
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [inviteNotice, setInviteNotice] = useState(null);
  const autoOpenedRef = useRef(false);
  const pendingSelfOpenRef = useRef(new Set());
  const bottomRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/chat/departments').then((d) => setDepartments(d.departments)).catch(() => {});
  }, []);

  // Arrivée depuis "Tchatter" sur une fiche profil : dès que la personne
  // ciblée apparaît dans le salon (elle doit y être connectée), on ouvre la
  // discussion privée avec elle automatiquement, une seule fois.
  useEffect(() => {
    if (!targetProfileId || autoOpenedRef.current) return;
    const match = roomUsers.find((u) => u.profileId === targetProfileId);
    if (match) {
      autoOpenedRef.current = true;
      openPrivate(match.socketId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUsers, targetProfileId]);

  // Connexion socket immédiate (observateur) dès l'arrivée sur la page,
  // pour afficher les compteurs par département avant même de rejoindre.
  useEffect(() => {
    const socket = getChatSocket();
    const onCounts = (c) => setCounts(c);
    const onIdentified = () => setIdentified(true);
    const onUsers = (u) => setRoomUsers(u);
    const onMessage = (msg) => setMessages((m) => [...m, msg]);
    const onBanned = () => setBanned(true);

    const onPrivateOpened = ({ threadId, peer }) => {
      const wasSelfInitiated = pendingSelfOpenRef.current.has(threadId);
      pendingSelfOpenRef.current.delete(threadId);
      setThreads((t) => (t.some((x) => x.threadId === threadId) ? t : [...t, { threadId, peer, messages: [], unread: false }]));
      if (wasSelfInitiated) {
        // Celui qui invite a directement sa fenêtre ouverte, prête à écrire.
        setActiveThreadId(threadId);
      } else {
        // L'autre n'est jamais forcé à rejoindre : juste prévenu, libre de
        // cliquer pour ouvrir la fenêtre (ou de l'ignorer — le fil se ferme
        // tout seul après 5 min sans réponse).
        setInviteNotice({ threadId, text: `${peer.pseudo} vous invite à tchatter, rejoindre ?` });
      }
    };
    const onPrivateMessage = (msg) => {
      setThreads((t) => t.map((x) => (x.threadId === msg.threadId
        ? { ...x, messages: [...x.messages, msg], unread: activeThreadIdRef.current !== msg.threadId }
        : x)));
    };
    const onPrivateClosed = ({ threadId }) => {
      setThreads((t) => t.filter((x) => x.threadId !== threadId));
      setActiveThreadId((id) => (id === threadId ? null : id));
    };
    const onLimitReached = () => setLimitNotice(`Maximum ${MAX_PRIVATE_THREADS} discussions privées ouvertes en même temps.`);

    socket.on('chat:counts', onCounts);
    socket.on('chat:identified', onIdentified);
    socket.on('chat:users', onUsers);
    socket.on('chat:message', onMessage);
    socket.on('chat:banned', onBanned);
    socket.on('chat:privateOpened', onPrivateOpened);
    socket.on('chat:privateMessage', onPrivateMessage);
    socket.on('chat:privateClosed', onPrivateClosed);
    socket.on('chat:privateLimitReached', onLimitReached);
    return () => {
      socket.off('chat:counts', onCounts);
      socket.off('chat:identified', onIdentified);
      socket.off('chat:users', onUsers);
      socket.off('chat:message', onMessage);
      socket.off('chat:banned', onBanned);
      socket.off('chat:privateOpened', onPrivateOpened);
      socket.off('chat:privateMessage', onPrivateMessage);
      socket.off('chat:privateClosed', onPrivateClosed);
      socket.off('chat:privateLimitReached', onLimitReached);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref pour connaître l'onglet actif dans le callback socket sans le
  // ré-abonner à chaque changement d'onglet.
  const activeThreadIdRef = useRef(null);
  useEffect(() => { activeThreadIdRef.current = activeThreadId; }, [activeThreadId]);

  useEffect(() => () => disconnectChatSocket(), []);

  const canJoin = user?.profile || identified;

  useEffect(() => {
    if (!department || !canJoin) return;
    apiFetch(`/api/chat/${department}/history`).then((d) => setMessages(d.messages)).catch(() => {});
    getChatSocket().emit('chat:join', department);
    return () => {
      getChatSocket().emit('chat:leave');
      setRoomUsers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, canJoin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, threads, activeThreadId]);

  const submitGuestForm = (e) => {
    e.preventDefault();
    if (guestPseudo.trim().length < 2) return;
    identifyAsGuest(guestPseudo.trim(), guestGender);
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (activeThreadId) {
      getChatSocket().emit('chat:privateMessage', { threadId: activeThreadId, content: text });
    } else {
      getChatSocket().emit('chat:message', text);
    }
    setText('');
  };

  // Envoi de photo réservé aux discussions privées (jamais dans un salon
  // public) : voir le bouton grisé du salon plus bas dans le rendu.
  const sendPhoto = async (file) => {
    if (!file || !activeThreadId) return;
    setSendingPhoto(true);
    setPhotoError('');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { url } = await apiFetch('/api/chat/photo', { method: 'POST', body: fd });
      getChatSocket().emit('chat:privateMessage', { threadId: activeThreadId, photoUrl: url });
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setSendingPhoto(false);
    }
  };

  const openPrivate = (targetSocketId) => {
    const socket = getChatSocket();
    if (targetSocketId === socket.id) return;
    pendingSelfOpenRef.current.add([socket.id, targetSocketId].sort().join(':'));
    socket.emit('chat:privateOpen', targetSocketId);
  };

  const closePrivate = (threadId) => {
    getChatSocket().emit('chat:privateClose', { threadId });
    setThreads((t) => t.filter((x) => x.threadId !== threadId));
    setActiveThreadId((id) => (id === threadId ? null : id));
  };

  const switchTab = (threadId) => {
    setActiveThreadId(threadId);
    if (threadId) setThreads((t) => t.map((x) => (x.threadId === threadId ? { ...x, unread: false } : x)));
  };

  const groupedUsers = GENDER_ORDER.map((g) => ({ gender: g, users: roomUsers.filter((u) => u.genderBucket === g) })).filter((g) => g.users.length > 0);
  const activeThread = threads.find((t) => t.threadId === activeThreadId);

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
              <p className={`text-[10px] mt-1 ${counts[d.code] > 0 ? 'text-green-700 font-medium' : 'text-neutral-400'}`}>
                {counts[d.code] > 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 align-middle" />}
                {counts[d.code] || 0} connecté(s)
              </p>
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
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
          <div>
            <h1 className="font-semibold">Salon {department} — {dept?.name}</h1>
            <p className="text-xs text-neutral-500">
              {user?.profile ? user.profile.pseudo : `${guestPseudo} (invité·e)`} · {roomUsers.length} connecté(s)
            </p>
          </div>
          <button className="btn-secondary text-xs" onClick={() => { setDepartment(null); setIdentified(false); setThreads([]); setActiveThreadId(null); }}>Changer</button>
        </div>

        {limitNotice && (
          <p className="text-xs text-red-600 py-1 cursor-pointer" onClick={() => setLimitNotice('')}>{limitNotice} (fermer)</p>
        )}
        {inviteNotice && threads.some((t) => t.threadId === inviteNotice.threadId) && (
          <p className="text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-lg px-3 py-2 my-1 flex items-center justify-between gap-2">
            <span>{inviteNotice.text}</span>
            <span className="flex items-center gap-2 shrink-0">
              <button className="underline hover:no-underline" onClick={() => { switchTab(inviteNotice.threadId); setInviteNotice(null); }}>
                Rejoindre
              </button>
              <span className="cursor-pointer" onClick={() => setInviteNotice(null)}>✕</span>
            </span>
          </p>
        )}

        <div className="flex gap-1 overflow-x-auto py-2 border-b border-neutral-200">
          <button onClick={() => switchTab(null)}
            className={`text-xs whitespace-nowrap rounded-full px-3 py-1 border ${!activeThreadId ? 'bg-brand-500 border-brand-500 text-white' : 'border-neutral-300 text-neutral-600'}`}>
            Salon {department}
          </button>
          {threads.map((t) => (
            <button key={t.threadId} onClick={() => switchTab(t.threadId)}
              className={`flex items-center gap-1 text-xs whitespace-nowrap rounded-full pl-3 pr-1.5 py-1 border ${
                activeThreadId === t.threadId ? 'bg-brand-500 border-brand-500 text-white' : 'border-neutral-300 text-neutral-600'
              }`}>
              <PeerIcon peer={t.peer} />
              <span className={activeThreadId === t.threadId ? '' : GENDER_TEXT_COLORS[t.peer.genderBucket]}>{t.peer.pseudo}</span>
              {t.unread && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
              <span onClick={(e) => { e.stopPropagation(); closePrivate(t.threadId); }} className="ml-1 hover:opacity-70">×</span>
            </button>
          ))}
        </div>

        {!activeThreadId ? (
          <>
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
          </>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              Discussion privée avec <PeerIcon peer={activeThread.peer} /> <span className={GENDER_TEXT_COLORS[activeThread.peer.genderBucket]}>{activeThread.peer.pseudo}</span>
            </p>
            {activeThread.messages.map((m, i) => (
              <div key={i} className="text-sm">
                <span className={`font-medium ${GENDER_TEXT_COLORS[m.from.genderBucket]}`}>{m.from.pseudo}</span>
                {m.photoUrl ? (
                  <a href={mediaUrl(m.photoUrl)} target="_blank" rel="noreferrer" className="block mt-1">
                    <img src={mediaUrl(m.photoUrl)} alt="" className="max-w-[200px] max-h-[200px] rounded-lg border border-neutral-200" />
                  </a>
                ) : (
                  <span className="text-neutral-800"> : {m.content}</span>
                )}
              </div>
            ))}
            {activeThread.messages.length === 0 && <p className="text-sm text-neutral-500">Dites bonjour ! Si la personne ne répond pas, cette discussion se ferme dans une minute.</p>}
            <div ref={bottomRef} />
          </div>
        )}

        {photoError && <p className="text-xs text-red-600 pt-1">{photoError}</p>}

        <form onSubmit={send} className="flex gap-2 pt-2 border-t border-neutral-200 items-center">
          {activeThreadId ? (
            <label className={`btn-secondary text-sm cursor-pointer shrink-0 ${sendingPhoto ? 'opacity-60 pointer-events-none' : ''}`} title="Envoyer une photo">
              📷
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                disabled={sendingPhoto}
                onChange={(e) => { e.target.files[0] && sendPhoto(e.target.files[0]); e.target.value = ''; }} />
            </label>
          ) : (
            <button type="button" disabled
              title="Pour envoyer une photo, démarrez une discussion privée"
              className="btn-secondary text-sm shrink-0 opacity-40 cursor-not-allowed">
              📷
            </button>
          )}
          <input className="input" placeholder="Votre message..." maxLength={500}
            value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary shrink-0">Envoyer</button>
        </form>
        {!activeThreadId && (
          <p className="text-[11px] text-neutral-400 pt-1">Pour envoyer une photo, démarrez une discussion privée avec un·e connecté·e.</p>
        )}
      </div>

      <div className="sm:w-48 shrink-0 border-t sm:border-t-0 sm:border-l border-neutral-200 pt-3 sm:pt-0 sm:pl-4 overflow-y-auto">
        <h2 className="text-xs font-semibold text-neutral-500 mb-2">Connectés ({roomUsers.length})</h2>
        <div className="space-y-3">
          {groupedUsers.map(({ gender, users }) => (
            <div key={gender}>
              <p className="text-[10px] uppercase text-neutral-400 mb-1">{GENDER_LABELS[gender]}</p>
              <div className="space-y-1">
                {users.map((u) => (
                  <button key={u.socketId} onClick={() => openPrivate(u.socketId)}
                    className="flex items-center gap-1.5 text-sm hover:underline w-full text-left">
                    <span className={`w-1.5 h-1.5 rounded-full ${GENDER_DOT_COLORS[gender]}`} />
                    <span className={GENDER_TEXT_COLORS[gender]}>{u.pseudo}</span>
                    <PeerIcon peer={{ isMember: u.isMember, experienceLevel: u.experienceLevel }} />
                  </button>
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
