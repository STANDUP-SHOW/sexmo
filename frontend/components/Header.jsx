'use client';

import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-neutral-800 sticky top-0 bg-neutral-950/90 backdrop-blur z-20">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-brand-400">
          Libertine<span className="text-neutral-100">Connect</span>
        </Link>

        {user ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/decouvrir" className="hover:text-brand-400">Découvrir</Link>
            <Link href="/messages" className="hover:text-brand-400">Messages</Link>
            <Link href="/profil" className="hover:text-brand-400">Mon profil</Link>
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="hover:text-brand-400">Admin</Link>
            )}
            <button onClick={logout} className="btn-secondary text-xs px-3 py-1.5">Déconnexion</button>
          </nav>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="hover:text-brand-400">Connexion</Link>
            <Link href="/signup" className="btn-primary text-sm px-3 py-1.5">Inscription</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
