'use client';

import Link from 'next/link';
import AgeGate from '../components/AgeGate';
import { useAuth } from '../lib/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <AgeGate />

      <section className="text-center py-16 space-y-6">
        <h1 className="text-4xl font-extrabold">
          Rencontres <span className="text-brand-400">libertines</span> entre adultes consentants
        </h1>
        <p className="text-neutral-400 max-w-xl mx-auto">
          Célibataires et couples ouverts d'esprit, partout en France. Créez votre profil,
          ajoutez jusqu'à 20 photos, échangez en toute discrétion.
        </p>
        <div className="flex justify-center gap-3">
          {user ? (
            <Link href="/decouvrir" className="btn-primary">Découvrir des profils</Link>
          ) : (
            <>
              <Link href="/signup" className="btn-primary">Créer un profil</Link>
              <Link href="/login" className="btn-secondary">Connexion</Link>
            </>
          )}
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4 py-8">
        <div className="card">
          <h3 className="font-semibold mb-1">Profils vérifiés</h3>
          <p className="text-sm text-neutral-400">Photos modérées avant publication, signalement en un clic.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-1">Partout en France</h3>
          <p className="text-sm text-neutral-400">Filtrez par ville, du plus grand nombre de grandes villes aux régions.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-1">Messagerie privée</h3>
          <p className="text-sm text-neutral-400">Discutez uniquement après un match mutuel, en temps réel.</p>
        </div>
      </section>
    </div>
  );
}
