// Liste indicative des principales villes françaises, groupées par région,
// utilisée pour l'autocomplete de ville à l'inscription et les filtres de recherche.
// Pas une table géographique exhaustive : à étendre avec une vraie base
// (ex. API Géo de l'État, api-adresse.data.gouv.fr) si besoin de couverture complète.

const FRENCH_CITIES = [
  // Île-de-France
  { name: 'Paris', region: 'Île-de-France' },
  { name: 'Boulogne-Billancourt', region: 'Île-de-France' },
  { name: 'Saint-Denis', region: 'Île-de-France' },
  { name: 'Argenteuil', region: 'Île-de-France' },
  { name: 'Versailles', region: 'Île-de-France' },
  { name: 'Créteil', region: 'Île-de-France' },
  { name: 'Nanterre', region: 'Île-de-France' },
  { name: 'Vitry-sur-Seine', region: 'Île-de-France' },
  { name: 'Aulnay-sous-Bois', region: 'Île-de-France' },
  { name: 'Meaux', region: 'Île-de-France' },
  // Auvergne-Rhône-Alpes
  { name: 'Lyon', region: 'Auvergne-Rhône-Alpes' },
  { name: 'Grenoble', region: 'Auvergne-Rhône-Alpes' },
  { name: 'Saint-Étienne', region: 'Auvergne-Rhône-Alpes' },
  { name: 'Clermont-Ferrand', region: 'Auvergne-Rhône-Alpes' },
  { name: 'Annecy', region: 'Auvergne-Rhône-Alpes' },
  { name: 'Valence', region: 'Auvergne-Rhône-Alpes' },
  { name: 'Chambéry', region: 'Auvergne-Rhône-Alpes' },
  { name: 'Villeurbanne', region: 'Auvergne-Rhône-Alpes' },
  // Provence-Alpes-Côte d'Azur
  { name: 'Marseille', region: "Provence-Alpes-Côte d'Azur" },
  { name: 'Nice', region: "Provence-Alpes-Côte d'Azur" },
  { name: 'Toulon', region: "Provence-Alpes-Côte d'Azur" },
  { name: 'Aix-en-Provence', region: "Provence-Alpes-Côte d'Azur" },
  { name: 'Avignon', region: "Provence-Alpes-Côte d'Azur" },
  { name: 'Cannes', region: "Provence-Alpes-Côte d'Azur" },
  { name: 'Antibes', region: "Provence-Alpes-Côte d'Azur" },
  // Occitanie
  { name: 'Toulouse', region: 'Occitanie' },
  { name: 'Montpellier', region: 'Occitanie' },
  { name: 'Nîmes', region: 'Occitanie' },
  { name: 'Perpignan', region: 'Occitanie' },
  { name: 'Béziers', region: 'Occitanie' },
  { name: 'Albi', region: 'Occitanie' },
  { name: 'Carcassonne', region: 'Occitanie' },
  // Nouvelle-Aquitaine
  { name: 'Bordeaux', region: 'Nouvelle-Aquitaine' },
  { name: 'Limoges', region: 'Nouvelle-Aquitaine' },
  { name: 'Poitiers', region: 'Nouvelle-Aquitaine' },
  { name: 'Pau', region: 'Nouvelle-Aquitaine' },
  { name: 'La Rochelle', region: 'Nouvelle-Aquitaine' },
  { name: 'Bayonne', region: 'Nouvelle-Aquitaine' },
  { name: 'Angoulême', region: 'Nouvelle-Aquitaine' },
  // Hauts-de-France
  { name: 'Lille', region: 'Hauts-de-France' },
  { name: 'Amiens', region: 'Hauts-de-France' },
  { name: 'Roubaix', region: 'Hauts-de-France' },
  { name: 'Tourcoing', region: 'Hauts-de-France' },
  { name: 'Dunkerque', region: 'Hauts-de-France' },
  { name: 'Calais', region: 'Hauts-de-France' },
  { name: 'Valenciennes', region: 'Hauts-de-France' },
  // Grand Est
  { name: 'Strasbourg', region: 'Grand Est' },
  { name: 'Reims', region: 'Grand Est' },
  { name: 'Metz', region: 'Grand Est' },
  { name: 'Nancy', region: 'Grand Est' },
  { name: 'Mulhouse', region: 'Grand Est' },
  { name: 'Colmar', region: 'Grand Est' },
  { name: 'Troyes', region: 'Grand Est' },
  // Pays de la Loire
  { name: 'Nantes', region: 'Pays de la Loire' },
  { name: 'Angers', region: 'Pays de la Loire' },
  { name: 'Le Mans', region: 'Pays de la Loire' },
  { name: 'Saint-Nazaire', region: 'Pays de la Loire' },
  { name: 'Laval', region: 'Pays de la Loire' },
  // Bretagne
  { name: 'Rennes', region: 'Bretagne' },
  { name: 'Brest', region: 'Bretagne' },
  { name: 'Quimper', region: 'Bretagne' },
  { name: 'Lorient', region: 'Bretagne' },
  { name: 'Vannes', region: 'Bretagne' },
  { name: 'Saint-Malo', region: 'Bretagne' },
  // Normandie
  { name: 'Rouen', region: 'Normandie' },
  { name: 'Le Havre', region: 'Normandie' },
  { name: 'Caen', region: 'Normandie' },
  { name: 'Cherbourg-en-Cotentin', region: 'Normandie' },
  { name: 'Évreux', region: 'Normandie' },
  // Bourgogne-Franche-Comté
  { name: 'Dijon', region: 'Bourgogne-Franche-Comté' },
  { name: 'Besançon', region: 'Bourgogne-Franche-Comté' },
  { name: 'Belfort', region: 'Bourgogne-Franche-Comté' },
  { name: 'Chalon-sur-Saône', region: 'Bourgogne-Franche-Comté' },
  // Centre-Val de Loire
  { name: 'Tours', region: 'Centre-Val de Loire' },
  { name: 'Orléans', region: 'Centre-Val de Loire' },
  { name: 'Bourges', region: 'Centre-Val de Loire' },
  { name: 'Chartres', region: 'Centre-Val de Loire' },
  // Corse
  { name: 'Ajaccio', region: 'Corse' },
  { name: 'Bastia', region: 'Corse' },
  // Outre-mer
  { name: 'Fort-de-France', region: 'Martinique' },
  { name: 'Pointe-à-Pitre', region: 'Guadeloupe' },
  { name: 'Saint-Denis (La Réunion)', region: 'La Réunion' },
  { name: 'Cayenne', region: 'Guyane' },
];

module.exports = FRENCH_CITIES;
