// Miroir de backend/src/constants/practices.js (pas de package partagé entre
// les deux apps). Garder les deux fichiers synchronisés en cas de changement.
export const PRACTICE_CATEGORIES = [
  {
    key: 'STYLE',
    label: 'Style de rencontre',
    practices: [
      { key: 'HOMME_SEUL', label: 'Homme seul' },
      { key: 'FEMME_SEULE', label: 'Femme seule' },
      { key: 'COUPLE', label: 'En couple' },
      { key: 'BI_CURIEUX', label: 'Bi-curieux·se' },
      { key: 'GROUPE', label: 'Rencontre en groupe' },
    ],
  },
  {
    key: 'ECHANGISME',
    label: 'Échangisme',
    practices: [
      { key: 'ECHANGE_SOFT', label: 'Échange soft' },
      { key: 'ECHANGE_COMPLET', label: 'Échange complet' },
      { key: 'TRIOLISME', label: 'Triolisme (partie à 3)' },
      { key: 'PARTOUZE', label: 'Partie à plusieurs (4 et +)' },
      { key: 'MEME_PIECE', label: 'Dans la même pièce' },
      { key: 'PIECES_SEPAREES', label: 'Dans des pièces séparées' },
    ],
  },
  {
    key: 'OBSERVATION',
    label: 'Voyeurisme & exhibitionnisme',
    practices: [
      { key: 'VOYEURISME', label: 'Voyeurisme (regarder)' },
      { key: 'EXHIBITIONNISME', label: 'Exhibitionnisme (être regardé·e)' },
      { key: 'PHOTOS_VIDEOS', label: 'Partage de photos/vidéos coquines' },
    ],
  },
  {
    key: 'AMBIANCE',
    label: 'Ambiance & lieux',
    practices: [
      { key: 'CLUB_ECHANGISTE', label: 'Clubs échangistes' },
      { key: 'SOIREE_PRIVEE', label: 'Soirées privées' },
      { key: 'EXTERIEUR', label: 'Rencontres en extérieur' },
      { key: 'VACANCES', label: 'Vacances libertines' },
    ],
  },
  {
    key: 'BDSM',
    label: 'BDSM & jeux de rôle',
    practices: [
      { key: 'DOMINATION', label: 'Domination' },
      { key: 'SOUMISSION', label: 'Soumission' },
      { key: 'JEUX_DE_ROLE', label: 'Jeux de rôle' },
      { key: 'BONDAGE_LEGER', label: 'Bondage léger' },
      { key: 'BANDEAU', label: 'Bandeau / jeux sensoriels' },
    ],
  },
  {
    key: 'FETICHISME',
    label: 'Fétichisme',
    practices: [
      { key: 'LINGERIE', label: 'Lingerie' },
      { key: 'CUIR', label: 'Cuir' },
      { key: 'LATEX', label: 'Latex' },
      { key: 'PIEDS', label: 'Pieds' },
      { key: 'UNIFORMES', label: 'Uniformes' },
    ],
  },
  {
    key: 'SANTE',
    label: 'Protection & santé',
    practices: [
      { key: 'PROTECTION_SYSTEMATIQUE', label: 'Protection systématique' },
      { key: 'DEPISTAGE_A_JOUR', label: 'Dépistage à jour' },
    ],
  },
];

export const PRACTICE_LABELS = Object.fromEntries(
  PRACTICE_CATEGORIES.flatMap((c) => c.practices.map((p) => [p.key, p.label]))
);
