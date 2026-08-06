'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AgeGate from '../components/AgeGate';
import { useAuth } from '../lib/AuthContext';
import { useSettings } from '../lib/SettingsContext';
import { apiFetch } from '../lib/api';
import { getChatSocket } from '../lib/chatSocket';

export default function HomePage() {
  const { user } = useAuth();
  const { tagline } = useSettings();
  const [testimonials, setTestimonials] = useState([]);
  const [chatConnected, setChatConnected] = useState(null);

  useEffect(() => {
    apiFetch('/api/testimonials').then((d) => setTestimonials(d.testimonials.slice(0, 3))).catch(() => {});
  }, []);

  // Observateur seul (pas d'identification) : suffit pour additionner les
  // compteurs par département et afficher un total en direct.
  useEffect(() => {
    const socket = getChatSocket();
    const onCounts = (counts) => setChatConnected(Object.values(counts).reduce((a, b) => a + b, 0));
    socket.on('chat:counts', onCounts);
    return () => socket.off('chat:counts', onCounts);
  }, []);

  return (
    <div>
      <AgeGate />

      <div className="bg-brand-500 text-white text-center text-sm font-medium py-2 px-4 -mx-4 sm:mx-0 rounded-b-lg sm:rounded-lg">
        🎉 Nouveau ! Sexmo est lancé : tout est gratuit et le restera toujours !
      </div>

      <section className="text-center py-16 space-y-6">
        <h1 className="text-4xl font-extrabold text-neutral-900">
          Entre <span className="text-brand-500">adultes</span> consentants
        </h1>
        <p className="text-neutral-400 max-w-xl mx-auto">
          {tagline || "Web Appli de rencontres gratuite pour adultes, petites annonces, profils hot non censurés..."}
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

      <section className="text-center py-8">
        <p className="text-lg font-semibold text-neutral-900">Profils sans filtres, ouvert à tous, dans le respect de la communauté Sexmo</p>
      </section>

      <section className="bg-brand-500 rounded-xl text-center py-10 px-4 space-y-4">
        <h2 className="text-4xl font-extrabold text-white">
          TCHAT PUBLIC OUVERT À TOUS<br />DISCUSSIONS PRIVÉES OUVERTES !
        </h2>
        <p className="text-xl font-bold text-white max-w-2xl mx-auto">
          Rejoignez le salon de discussion de votre département,<br />
          Avec ou Sans compte<br />
          entrez juste un pseudo et blablatez en toute discrétion
        </p>
        <Link href="/tchat" className="inline-block bg-white text-green-600 font-semibold rounded-lg px-5 py-2.5 hover:bg-neutral-100 transition">
          Rejoindre le tchat
        </Link>
        {chatConnected != null && (
          <p className="text-white/90 text-sm font-medium flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            {chatConnected} connecté{chatConnected > 1 ? 's' : ''} actuellement
          </p>
        )}
      </section>

      <section className="card py-6">
        <p className="font-semibold text-neutral-900 text-center mb-4">sexmo c'est :</p>
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-3xl">🚫💳</p>
            <p className="text-sm font-bold text-neutral-900">Aucune carte bancaire demandée</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl">🆓</p>
            <p className="text-sm font-bold text-neutral-900">Gratuit et sans pub</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl">📱</p>
            <p className="text-sm font-bold text-neutral-900">Accès à toutes les fonctionnalités</p>
          </div>
        </div>
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
