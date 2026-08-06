import { notFound } from 'next/navigation';
import cities from '../../../lib/seoCities.json';
import CityLandingClient from './CityLandingClient';

export function generateStaticParams() {
  return cities.map((c) => ({ ville: c.slug }));
}

export function generateMetadata({ params }) {
  const city = cities.find((c) => c.slug === params.ville);
  if (!city) return {};
  const title = `Tchat gratuit & rencontres libertines à ${city.name} | sexmo`;
  const description = `Rencontres libertines gratuites, tchat gratuit anonyme, annonces coquines et rendez-vous entre adultes consentants à ${city.name} (${city.departmentName}). Inscription gratuite en 45 secondes, sans carte bancaire, sans pub.`;
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
