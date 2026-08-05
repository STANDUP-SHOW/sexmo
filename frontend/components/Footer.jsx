'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../lib/api';

export default function Footer() {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    apiFetch('/api/pages').then((d) => setPages(d.pages)).catch(() => {});
  }, []);

  return (
    <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-neutral-500 space-y-3">
      {pages.length > 0 && (
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {pages.map((p) => (
            <Link key={p.slug} href={`/page/${p.slug}`} className="hover:text-brand-500">{p.title}</Link>
          ))}
          <Link href="/avis" className="hover:text-brand-500">Avis</Link>
        </nav>
      )}
      <p>Site réservé aux personnes majeures (18 ans et plus). Toute sollicitation à caractère commercial est interdite et sanctionnée par la suppression du compte.</p>
      <p>Un abus ? Utilisez le bouton "Signaler" sur un profil, ou contactez la modération.</p>
    </footer>
  );
}
