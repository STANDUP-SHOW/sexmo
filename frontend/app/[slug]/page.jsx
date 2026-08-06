'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getToken } from '../../lib/api';

// URL de profil personnalisée façon "pages Facebook" (sexmo.fr/<slug>) :
// résout le slug côté API puis redirige vers la fiche adaptée à la
// connexion (membre -> /profil/<id>, visiteur -> /parcourir/<id>).
export default function SlugRedirectPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch(`/api/public/profiles/slug/${slug}`)
      .then((d) => {
        const target = getToken() ? `/profil/${d.id}` : `/parcourir/${d.id}`;
        router.replace(target);
      })
      .catch(() => setNotFound(true));
  }, [slug, router]);

  if (notFound) {
    return (
      <div className="max-w-md mx-auto text-center space-y-3 py-12">
        <p className="text-neutral-500">Ce profil n'existe pas ou n'est plus disponible.</p>
        <Link href="/" className="btn-primary inline-block">Retour à l'accueil</Link>
      </div>
    );
  }

  return <p className="text-neutral-500 text-center py-12">Chargement...</p>;
}
