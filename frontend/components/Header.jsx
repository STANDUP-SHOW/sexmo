'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { mediaUrl } from '../lib/api';
import { splitBrandName } from '../lib/splitBrandName';
import { getSocket } from '../lib/socket';
import LogoMark from './LogoMark';

export default function Header() {
  const { user, logout, impersonating, stopImpersonating } = useAuth();
  const { siteName, logoUrl } = useSettings();
  const [first, second] = splitBrandName(siteName);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    if (!user?.profile) return;
    const socket = getSocket();

    const pushNotice = (notice) => {
      const id = crypto.randomUUID();
      setNotices((n) => [...n, { id, ...notice }]);
      setTimeout(() => setNotices((n) => n.filter((x) => x.id !== id)), 8000);
    };

    const onLikeReceived = ({ fromPseudo, fromProfileId }) => {
      pushNotice({ kind: 'like', text: `${fromPseudo} vous aime bien, et vous ?`, href: `/profil/${fromProfileId}` });
    };
    const onMatchNew = ({ fromPseudo, conversationId }) => {
      pushNotice({ kind: 'match', text: `🎉 C'est un match avec ${fromPseudo} ! Félicitations`, href: `/messages/${conversationId}` });
    };

    socket.on('like:received', onLikeReceived);
    socket.on('match:new', onMatchNew);
    return () => {
      socket.off('like:received', onLikeReceived);
      socket.off('match:new', onMatchNew);
    };
  }, [user?.profile]);

  return (
    <header className="border-b border-ink-800 sticky top-0 bg-ink-900/95 backdrop-blur z-20">
      {notices.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs">
          {notices.map((n) => (
            <Link key={n.id} href={n.href}
              className={`block text-sm rounded-lg px-4 py-3 shadow-lg text-white ${n.kind === 'match' ? 'bg-brand-500' : 'bg-ink-800'}`}
              onClick={() => setNotices((cur) => cur.filter((x) => x.id !== n.id))}>
              {n.text}
            </Link>
          ))}
        </div>
      )}
      {impersonating && (
        <div className="bg-yellow-500 text-yellow-950 text-xs font-medium px-4 py-1.5 flex items-center justify-between">
          <span>Vous naviguez en tant que {user?.profile?.pseudo || user?.email}</span>
          <button onClick={stopImpersonating} className="underline hover:no-underline">Retour admin</button>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          {logoUrl ? <img src={mediaUrl(logoUrl)} alt="" className="h-7 w-7 rounded object-cover" /> : <LogoMark />}
          <span><span className="text-brand-400">{first}</span><span className="text-white">{second}</span></span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-4 text-sm text-neutral-200">
            {user.profile && (
              <>
                <Link href="/decouvrir" className="hover:text-brand-400">Découvrir</Link>
                <Link href="/galerie" className="hover:text-brand-400">Galerie</Link>
                <Link href="/messages" className="hover:text-brand-400">Messages</Link>
                <Link href="/profil" className="hover:text-brand-400">Mon profil</Link>
                <Link href="/lieux" className="hover:text-brand-400">Lieux</Link>
              </>
            )}
            <Link href="/tchat" className="hover:text-brand-400">Tchat</Link>
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="hover:text-brand-400">Back-office</Link>
            )}
            <button onClick={logout} className="bg-ink-700 hover:bg-ink-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
              Déconnexion
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-3 text-sm text-neutral-200">
            <Link href="/parcourir" className="hover:text-brand-400">Parcourir</Link>
            <Link href="/tchat" className="hover:text-brand-400">Tchat</Link>
            <Link href="/lieux" className="hover:text-brand-400">Lieux</Link>
            <Link href="/login" className="hover:text-brand-400">Connexion</Link>
            <Link href="/signup" className="btn-primary text-sm px-3 py-1.5">Inscription</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
