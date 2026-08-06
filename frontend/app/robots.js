export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/rencontres', '/parcourir', '/tchat', '/lieux', '/galerie', '/avis'],
        disallow: ['/admin', '/profil', '/messages', '/decouvrir'],
      },
    ],
    sitemap: 'https://sexmo.fr/sitemap.xml',
  };
}
