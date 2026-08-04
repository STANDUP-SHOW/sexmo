// Liste indicative des principales villes françaises, groupées par région,
// utilisée pour l'autocomplete de ville à l'inscription, les filtres de
// recherche, et le calcul de distance approximative (voir src/utils/geo.js).
// Coordonnées au niveau "centre-ville" (précision de l'ordre de la dizaine de
// km), volontairement pas plus précises : jamais de géolocalisation exacte
// ou en temps réel. Pas une table géographique exhaustive : à étendre avec
// une vraie base (ex. API Géo de l'État, api-adresse.data.gouv.fr) si besoin
// de couverture complète.

const FRENCH_CITIES = [
  // Île-de-France
  { name: 'Paris', region: 'Île-de-France', lat: 48.8566, lng: 2.3522 },
  { name: 'Boulogne-Billancourt', region: 'Île-de-France', lat: 48.8397, lng: 2.24 },
  { name: 'Saint-Denis', region: 'Île-de-France', lat: 48.9362, lng: 2.3574 },
  { name: 'Argenteuil', region: 'Île-de-France', lat: 48.9474, lng: 2.2482 },
  { name: 'Versailles', region: 'Île-de-France', lat: 48.8049, lng: 2.1204 },
  { name: 'Créteil', region: 'Île-de-France', lat: 48.7904, lng: 2.4556 },
  { name: 'Nanterre', region: 'Île-de-France', lat: 48.8924, lng: 2.2069 },
  { name: 'Vitry-sur-Seine', region: 'Île-de-France', lat: 48.7876, lng: 2.3931 },
  { name: 'Aulnay-sous-Bois', region: 'Île-de-France', lat: 48.9333, lng: 2.4931 },
  { name: 'Meaux', region: 'Île-de-France', lat: 48.9601, lng: 2.8788 },
  // Auvergne-Rhône-Alpes
  { name: 'Lyon', region: 'Auvergne-Rhône-Alpes', lat: 45.764, lng: 4.8357 },
  { name: 'Grenoble', region: 'Auvergne-Rhône-Alpes', lat: 45.1885, lng: 5.7245 },
  { name: 'Saint-Étienne', region: 'Auvergne-Rhône-Alpes', lat: 45.4397, lng: 4.3872 },
  { name: 'Clermont-Ferrand', region: 'Auvergne-Rhône-Alpes', lat: 45.7772, lng: 3.087 },
  { name: 'Annecy', region: 'Auvergne-Rhône-Alpes', lat: 45.8992, lng: 6.1294 },
  { name: 'Valence', region: 'Auvergne-Rhône-Alpes', lat: 44.9334, lng: 4.8924 },
  { name: 'Chambéry', region: 'Auvergne-Rhône-Alpes', lat: 45.5646, lng: 5.9178 },
  { name: 'Villeurbanne', region: 'Auvergne-Rhône-Alpes', lat: 45.7667, lng: 4.8794 },
  // Provence-Alpes-Côte d'Azur
  { name: 'Marseille', region: "Provence-Alpes-Côte d'Azur", lat: 43.2965, lng: 5.3698 },
  { name: 'Nice', region: "Provence-Alpes-Côte d'Azur", lat: 43.7102, lng: 7.262 },
  { name: 'Toulon', region: "Provence-Alpes-Côte d'Azur", lat: 43.1242, lng: 5.928 },
  { name: 'Aix-en-Provence', region: "Provence-Alpes-Côte d'Azur", lat: 43.5297, lng: 5.4474 },
  { name: 'Avignon', region: "Provence-Alpes-Côte d'Azur", lat: 43.9493, lng: 4.8055 },
  { name: 'Cannes', region: "Provence-Alpes-Côte d'Azur", lat: 43.5528, lng: 7.0174 },
  { name: 'Antibes', region: "Provence-Alpes-Côte d'Azur", lat: 43.5804, lng: 7.1251 },
  // Occitanie
  { name: 'Toulouse', region: 'Occitanie', lat: 43.6047, lng: 1.4442 },
  { name: 'Montpellier', region: 'Occitanie', lat: 43.6108, lng: 3.8767 },
  { name: 'Nîmes', region: 'Occitanie', lat: 43.8367, lng: 4.3601 },
  { name: 'Perpignan', region: 'Occitanie', lat: 42.6887, lng: 2.8948 },
  { name: 'Béziers', region: 'Occitanie', lat: 43.3442, lng: 3.2158 },
  { name: 'Albi', region: 'Occitanie', lat: 43.9298, lng: 2.148 },
  { name: 'Carcassonne', region: 'Occitanie', lat: 43.213, lng: 2.3491 },
  // Nouvelle-Aquitaine
  { name: 'Bordeaux', region: 'Nouvelle-Aquitaine', lat: 44.8378, lng: -0.5792 },
  { name: 'Limoges', region: 'Nouvelle-Aquitaine', lat: 45.8336, lng: 1.2611 },
  { name: 'Poitiers', region: 'Nouvelle-Aquitaine', lat: 46.5802, lng: 0.3404 },
  { name: 'Pau', region: 'Nouvelle-Aquitaine', lat: 43.2951, lng: -0.3708 },
  { name: 'La Rochelle', region: 'Nouvelle-Aquitaine', lat: 46.1603, lng: -1.1511 },
  { name: 'Bayonne', region: 'Nouvelle-Aquitaine', lat: 43.4929, lng: -1.4748 },
  { name: 'Angoulême', region: 'Nouvelle-Aquitaine', lat: 45.6484, lng: 0.1562 },
  // Hauts-de-France
  { name: 'Lille', region: 'Hauts-de-France', lat: 50.6292, lng: 3.0573 },
  { name: 'Amiens', region: 'Hauts-de-France', lat: 49.8942, lng: 2.2957 },
  { name: 'Roubaix', region: 'Hauts-de-France', lat: 50.6942, lng: 3.1746 },
  { name: 'Tourcoing', region: 'Hauts-de-France', lat: 50.7236, lng: 3.161 },
  { name: 'Dunkerque', region: 'Hauts-de-France', lat: 51.0343, lng: 2.3768 },
  { name: 'Calais', region: 'Hauts-de-France', lat: 50.9513, lng: 1.8587 },
  { name: 'Valenciennes', region: 'Hauts-de-France', lat: 50.3574, lng: 3.5233 },
  // Grand Est
  { name: 'Strasbourg', region: 'Grand Est', lat: 48.5734, lng: 7.7521 },
  { name: 'Reims', region: 'Grand Est', lat: 49.2583, lng: 4.0317 },
  { name: 'Metz', region: 'Grand Est', lat: 49.1193, lng: 6.1757 },
  { name: 'Nancy', region: 'Grand Est', lat: 48.6921, lng: 6.1844 },
  { name: 'Mulhouse', region: 'Grand Est', lat: 47.7508, lng: 7.3359 },
  { name: 'Colmar', region: 'Grand Est', lat: 48.0794, lng: 7.3585 },
  { name: 'Troyes', region: 'Grand Est', lat: 48.2973, lng: 4.0744 },
  // Pays de la Loire
  { name: 'Nantes', region: 'Pays de la Loire', lat: 47.2184, lng: -1.5536 },
  { name: 'Angers', region: 'Pays de la Loire', lat: 47.4784, lng: -0.5632 },
  { name: 'Le Mans', region: 'Pays de la Loire', lat: 48.0061, lng: 0.1996 },
  { name: 'Saint-Nazaire', region: 'Pays de la Loire', lat: 47.2733, lng: -2.2135 },
  { name: 'Laval', region: 'Pays de la Loire', lat: 48.0733, lng: -0.7708 },
  // Bretagne
  { name: 'Rennes', region: 'Bretagne', lat: 48.1173, lng: -1.6778 },
  { name: 'Brest', region: 'Bretagne', lat: 48.3904, lng: -4.4861 },
  { name: 'Quimper', region: 'Bretagne', lat: 47.996, lng: -4.1023 },
  { name: 'Lorient', region: 'Bretagne', lat: 47.7482, lng: -3.366 },
  { name: 'Vannes', region: 'Bretagne', lat: 47.6587, lng: -2.7603 },
  { name: 'Saint-Malo', region: 'Bretagne', lat: 48.6493, lng: -2.0257 },
  // Normandie
  { name: 'Rouen', region: 'Normandie', lat: 49.4431, lng: 1.0993 },
  { name: 'Le Havre', region: 'Normandie', lat: 49.4944, lng: 0.1079 },
  { name: 'Caen', region: 'Normandie', lat: 49.1829, lng: -0.3707 },
  { name: 'Cherbourg-en-Cotentin', region: 'Normandie', lat: 49.6337, lng: -1.6222 },
  { name: 'Évreux', region: 'Normandie', lat: 49.0245, lng: 1.151 },
  // Bourgogne-Franche-Comté
  { name: 'Dijon', region: 'Bourgogne-Franche-Comté', lat: 47.322, lng: 5.0415 },
  { name: 'Besançon', region: 'Bourgogne-Franche-Comté', lat: 47.2378, lng: 6.0241 },
  { name: 'Belfort', region: 'Bourgogne-Franche-Comté', lat: 47.6379, lng: 6.8629 },
  { name: 'Chalon-sur-Saône', region: 'Bourgogne-Franche-Comté', lat: 46.7806, lng: 4.8524 },
  // Centre-Val de Loire
  { name: 'Tours', region: 'Centre-Val de Loire', lat: 47.3941, lng: 0.6848 },
  { name: 'Orléans', region: 'Centre-Val de Loire', lat: 47.9029, lng: 1.9093 },
  { name: 'Bourges', region: 'Centre-Val de Loire', lat: 47.081, lng: 2.3988 },
  { name: 'Chartres', region: 'Centre-Val de Loire', lat: 48.4467, lng: 1.4893 },
  // Corse
  { name: 'Ajaccio', region: 'Corse', lat: 41.9192, lng: 8.7386 },
  { name: 'Bastia', region: 'Corse', lat: 42.7028, lng: 9.4508 },
  // Outre-mer
  { name: 'Fort-de-France', region: 'Martinique', lat: 14.6161, lng: -61.0588 },
  { name: 'Pointe-à-Pitre', region: 'Guadeloupe', lat: 16.241, lng: -61.5335 },
  { name: 'Saint-Denis (La Réunion)', region: 'La Réunion', lat: -20.8789, lng: 55.4481 },
  { name: 'Cayenne', region: 'Guyane', lat: 4.9227, lng: -52.3269 },
];

module.exports = FRENCH_CITIES;
