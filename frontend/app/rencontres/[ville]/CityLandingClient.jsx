'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';

// Hash simple et stable (même ville = même variante à chaque rebuild) pour
// répartir 500 pages ville sur plusieurs textes différents plutôt qu'un
// seul gabarit recopié 500 fois — le contenu change vraiment, pas juste le
// nom de la ville.
function pickVariant(list, seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

const INTRO_VARIANTS = (city) => [
  `Coco tchat gratuit et anonyme, petites annonces entre particuliers, rencontres libertines gratuites : à ${city.name}, sexmo réunit des célibataires et couples ouverts d'esprit, adultes consentants, pour discuter et se rencontrer en toute discrétion. Inscription gratuite en 45 secondes, sans carte bancaire, sans publicité.`,
  `Envie de draguer en ligne à ${city.name} sans y laisser un centime ? sexmo est une appli gratuite de rencontres pour adultes : tchat anonyme, annonces coquines entre particuliers et rendez-vous libertin, le tout accessible en quelques secondes et sans engagement.`,
  `À ${city.name} comme partout en France, sexmo propose un tchat gratuit anonyme ouvert à tous, des petites annonces sexe entre particuliers et des profils hot non censurés — pour une rencontre éphémère, une rencontre coquine ou simplement papoter sans tabou.`,
  `sexmo, c'est la rencontre libertine gratuite à ${city.name} : profil en 45 secondes, aucune carte bancaire requise, aucune publicité. Rejoignez le tchat gratuit anonyme du département ou parcourez les annonces entre particuliers pour un rendez-vous libertin près de chez vous.`,
  `Basé·e à ${city.name} et envie de rencontres sans prise de tête ? sexmo réunit tchat gratuit anonyme, annonces coquines et profils non censurés d'adultes consentants — de la simple discussion à la rencontre éphémère, gratuit du premier clic au dernier message.`,
  `Petites annonces entre particuliers, rencontre coquine ou rendez-vous libertin : à ${city.name}, sexmo met en relation gratuitement des adultes consentants, avec un tchat anonyme ouvert à tous et sans aucune publicité intrusive.`,
];

const FAQ = (city) => [
  {
    q: `Le tchat est-il vraiment gratuit à ${city.name} ?`,
    a: `Oui. Le Sexmo Tchat du département ${city.departmentName} est en accès libre, avec ou sans compte : entrez un pseudo et rejoignez le salon en quelques secondes.`,
  },
  {
    q: `Comment faire une rencontre libertine à ${city.name} ?`,
    a: `Créez un profil gratuit, précisez votre catégorie d'annonce (rencontre éphémère, échangisme, pluralisme...), puis parcourez les profils de ${city.name} et des environs ou rejoignez le tchat pour échanger en direct.`,
  },
  {
    q: `Puis-je voir des profils sans créer de compte ?`,
    a: `Oui, la page « Parcourir sans compte » permet de consulter les annonces publiques de ${city.name} sans inscription. Un compte gratuit est nécessaire pour liker, discuter en message privé et accéder aux galeries.`,
  },
];

export default function CityLandingClient({ city }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    apiFetch(`/api/public/profiles?city=${encodeURIComponent(city.name)}`)
      .then((d) => setCount(d.total))
      .catch(() => {});
  }, [city.name]);

  const faq = FAQ(city);
  const intro = pickVariant(INTRO_VARIANTS(city), city.slug);

  return (
    <div className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faq.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      <section className="text-center py-10 space-y-4">
        <p className="text-sm text-brand-600 font-medium">{city.departmentName} · {city.region}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900">
          Tchat gratuit & rencontres libertines à <span className="text-brand-500">{city.name}</span>
        </h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">{intro}</p>
        {count != null && count > 0 && (
          <p className="inline-block bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-4 py-1.5 text-sm font-medium">
            🔥 {count} profil{count > 1 ? 's' : ''} actif{count > 1 ? 's' : ''} à {city.name}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href={`/parcourir?city=${encodeURIComponent(city.name)}`} className="btn-primary">Voir les annonces à {city.name}</Link>
          <Link href="/signup" className="btn-secondary">Créer un profil gratuit</Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold mb-1">Tchat gratuit anonyme</h2>
          <p className="text-sm text-neutral-500">
            Rejoignez le salon de discussion public du département {city.departmentName}, avec ou sans compte.
            Discussions privées possibles avec les membres connectés.
          </p>
          <Link href={`/tchat?department=${city.department}`} className="text-sm text-brand-600 hover:text-brand-700 mt-2 inline-block">
            Rejoindre le tchat de {city.departmentName} →
          </Link>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-1">Annonces & rendez-vous libertins</h2>
          <p className="text-sm text-neutral-500">
            Rencontre éphémère, échangisme, pluralisme, voyeurisme ou rencontre en groupe : filtrez les annonces par
            catégorie et retrouvez des profils proches de {city.name}.
          </p>
          <Link href={`/decouvrir`} className="text-sm text-brand-600 hover:text-brand-700 mt-2 inline-block">
            Découvrir les profils →
          </Link>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-1">Galerie coquine</h2>
          <p className="text-sm text-neutral-500">
            Photos et vidéos publiées par les membres, modérées avant publication — pour se faire une idée avant
            d'échanger.
          </p>
          <Link href="/galerie" className="text-sm text-brand-600 hover:text-brand-700 mt-2 inline-block">
            Voir la galerie →
          </Link>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-1">Lieux de rencontre</h2>
          <p className="text-sm text-neutral-500">
            Saunas, love shops, hammams, bars et clubs référencés par les membres dans le département {city.departmentName}.
          </p>
          <Link href={`/lieux`} className="text-sm text-brand-600 hover:text-brand-700 mt-2 inline-block">
            Voir les lieux de rencontre →
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-neutral-900">Questions fréquentes</h2>
        {faq.map((f) => (
          <details key={f.q} className="card">
            <summary className="font-medium cursor-pointer">{f.q}</summary>
            <p className="text-sm text-neutral-500 mt-2">{f.a}</p>
          </details>
        ))}
      </section>

      <p className="text-center text-xs text-neutral-400">
        <Link href="/rencontres" className="hover:text-brand-600">Voir toutes les villes</Link>
      </p>
    </div>
  );
}
