import cities from '../lib/seoCities.json';

const BASE_URL = 'https://sexmo.fr';

export default function sitemap() {
  const staticPages = ['', '/rencontres', '/parcourir', '/tchat', '/lieux', '/galerie', '/avis', '/login', '/signup'].map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const cityPages = cities.map((c) => ({
    url: `${BASE_URL}/rencontres/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...cityPages];
}
