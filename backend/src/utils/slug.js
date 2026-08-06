// URL de profil personnalisée façon "pages Facebook" (sexmo.fr/<slug>).
// Format : minuscules, chiffres, tirets, 3 à 30 caractères, ne commence/finit
// pas par un tiret — même contrainte que la colonne VARCHAR(30) en base.
const SLUG_FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

// Segments de route déjà utilisés par le site (dossiers sous frontend/app,
// plus les fichiers spéciaux Next.js servis à la racine) : un membre ne doit
// pas pouvoir se réserver une URL qui entrerait en collision avec une page
// existante.
const RESERVED_SLUGS = new Set([
  'admin', 'avis', 'decouvrir', 'galerie', 'lieux', 'login', 'messages',
  'page', 'parcourir', 'profil', 'rencontres', 'signup', 'tchat',
  'api', 'icon', 'robots', 'sitemap', 'favicon', 'static', '_next',
  'sexmo', 'contact', 'cgu', 'cgv', 'mentions-legales', 'confidentialite',
  'aide', 'faq', 'support', 'blog', 'accueil', 'home', 'null', 'undefined',
]);

function isValidSlugFormat(slug) {
  return typeof slug === 'string' && SLUG_FORMAT.test(slug);
}

function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

module.exports = { SLUG_FORMAT, RESERVED_SLUGS, isValidSlugFormat, isReservedSlug };
