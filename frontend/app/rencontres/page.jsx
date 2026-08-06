import Link from 'next/link';
import cities from '../../lib/seoCities.json';

export const metadata = {
  title: 'Rencontres libertines et tchat gratuit dans toute la France | sexmo',
  description: "Trouvez votre ville : rencontres libertines gratuites, tchat gratuit anonyme et annonces coquines dans les 500 plus grandes villes de France.",
  alternates: { canonical: 'https://sexmo.fr/rencontres' },
  robots: { index: true, follow: true },
};

export default function RencontresIndexPage() {
  const byRegion = cities.reduce((acc, c) => {
    (acc[c.region] = acc[c.region] || []).push(c);
    return acc;
  }, {});
  const regions = Object.keys(byRegion).sort();

  return (
    <div className="space-y-8">
      <div className="text-center py-6 space-y-2">
        <h1 className="text-3xl font-extrabold text-neutral-900">Rencontres libertines partout en France</h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          Tchat gratuit, annonces et rencontres coquines : choisissez votre ville parmi les 500 plus grandes villes de France.
        </p>
      </div>

      {regions.map((region) => (
        <section key={region}>
          <h2 className="text-sm font-semibold text-neutral-700 mb-2">{region}</h2>
          <div className="flex flex-wrap gap-2">
            {byRegion[region]
              .sort((a, b) => b.population - a.population)
              .map((c) => (
                <Link key={c.slug} href={`/rencontres/${c.slug}`}
                  className="text-sm bg-neutral-100 hover:bg-brand-50 hover:text-brand-700 rounded-full px-3 py-1.5 transition">
                  {c.name}
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
