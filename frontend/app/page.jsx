'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AgeGate from '../components/AgeGate';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { apiFetch } from '../lib/api';

export default function HomePage() {
  const { user } = useAuth();
  const { tagline } = useSettings();
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    apiFetch('/api/testimonials').then((d) => setTestimonials(d.testimonials.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div>
      <AgeGate />

      <div className="bg-brand-500 text-white text-center text-sm font-medium py-2 px-4 -mx-4 sm:mx-0 rounded-b-lg sm:rounded-lg">
        🎉 Lancement : tout est gratuit du 1er août 2026 au 1er février 2027 — accès total à toutes les fonctionnalités !
      </div>

      <section className="text-center py-16 space-y-6">
        <h1 className="text-4xl font-extrabold text-neutral-900">
          Rencontres <span className="text-brand-500">libertines</span> entre adultes consentants
        </h1>
        <p className="text-neutral-400 max-w-xl mx-auto">
          {tagline || "Célibataires et couples ouverts d'esprit, partout en France. Créez votre profil, ajoutez jusqu'à 20 photos, échangez en toute discrétion."}
        </p>
        <div className="flex justify-center gap-3">
          {user ? (
            <Link href="/decouvrir" className="btn-primary">Découvrir des profils</Link>
          ) : (
            <>
              <Link href="/signup" className="btn-primary">Créer un profil</Link>
              <Link href="/parcourir" className="btn-secondary">Parcourir sans compte</Link>
            </>
          )}
        </div>
      </section>

      <section className="card text-center py-6 space-y-1">
        <p className="font-semibold text-neutral-900">sexmo c'est :</p>
        <p className="text-sm text-neutral-600">Inscription gratuite en 45 secondes. Pas de carte de crédit, tout est gratuit et sans pub !</p>
        <p className="text-sm text-neutral-600">Accès total à toutes les fonctionnalités.</p>
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
          <p className="text-sm text-neutral-400">Discutez en temps réel avec les connectés.</p>
        </div>
      </section>

      <section className="bg-brand-500 rounded-xl text-center py-10 px-4 space-y-4">
        <h2 className="text-4xl font-extrabold text-white">
          TCHAT PUBLIC OUVERT À TOUS – DISCUSSIONS PRIVÉES OUVERTES !
        </h2>
        <p className="text-xl font-bold text-white max-w-2xl mx-auto">
          Rejoignez le salon de discussion de votre département,<br />
          Avec ou Sans compte<br />
          entrez juste un pseudo et blablatez en toute discrétion
        </p>
        <Link href="/tchat" className="inline-block bg-white text-green-600 font-semibold rounded-lg px-5 py-2.5 hover:bg-neutral-100 transition">
          Rejoindre le tchat
        </Link>
      </section>

      {testimonials.length > 0 && (
        <section className="py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Ils en parlent</h2>
            <Link href="/avis" className="text-sm text-brand-500 hover:text-brand-600">Voir tous les avis</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.id} className="card">
                <div className="text-yellow-400 text-sm">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
                <p className="text-sm text-neutral-800 mt-1">{t.content}</p>
                <p className="text-xs text-neutral-500 mt-1">{t.authorPseudo}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
