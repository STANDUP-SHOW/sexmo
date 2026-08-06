import { notFound } from 'next/navigation';
import cities from '../../../lib/seoCities.json';
import CityLandingClient from './CityLandingClient';

export function generateStaticParams() {
  return cities.map((c) => ({ ville: c.slug }));
}

// Même logique de variantes que CityLandingClient (voir ce fichier) : le
// <title>/<meta description> ne doivent pas non plus être 500 fois le même
// gabarit avec juste le nom de la ville qui change.
function pickVariant(list, seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

const TITLE_VARIANTS = (city) => [
  `Tchat gratuit & rencontres libertines à ${city.name} | sexmo`,
  `Rencontre coquine gratuite à ${city.name} | sexmo`,
  `Petites annonces & tchat anonyme à ${city.name} | sexmo`,
  `Rencontres sex gratuit à ${city.name} | sexmo`,
];

const DESCRIPTION_VARIANTS = (city) => [
  `Rencontres libertines gratuites, tchat gratuit anonyme, annonces coquines et rendez-vous entre adultes consentants à ${city.name} (${city.departmentName}). Inscription gratuite en 45 secondes, sans carte bancaire, sans pub.`,
  `Appli gratuite de rencontres pour adultes à ${city.name} : coco tchat anonyme, petites annonces sexe entre particuliers, profils hot non censurés. Sans carte bancaire, sans publicité.`,
  `Draguer en ligne à ${city.name} (${city.departmentName}) : tchat gratuit anonyme, rencontre éphémère ou coquine, rendez-vous libertin entre adultes consentants. Inscription gratuite en 45 secondes.`,
];

export function generateMetadata({ params }) {
  const city = cities.find((c) => c.slug === params.ville);
  if (!city) return {};
  const title = pickVariant(TITLE_VARIANTS(city), city.slug);
  const description = pickVariant(DESCRIPTION_VARIANTS(city), city.slug + city.slug);
  return {
    title,
    description,
    alternates: { canonical: `https://sexmo.fr/rencontres/${city.slug}` },
    openGraph: { title, description, url: `https://sexmo.fr/rencontres/${city.slug}` },
    // Le layout racine passe tout le site en noindex par défaut (voir
    // app/layout.jsx) — ces pages SEO doivent explicitement redevenir
    // indexables, contrairement aux pages privées (profil, messages...).
    robots: { index: true, follow: true },
  };
}

export default function CityPage({ params }) {
  const city = cities.find((c) => c.slug === params.ville);
  if (!city) return notFound();
  return <CityLandingClient city={city} />;
}
