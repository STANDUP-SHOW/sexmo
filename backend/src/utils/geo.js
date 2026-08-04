const FRENCH_CITIES = require('../data/frenchCities');

const CITY_COORDS = new Map(
  FRENCH_CITIES.map((c) => [c.name.trim().toLowerCase(), { lat: c.lat, lng: c.lng }])
);

function getCityCoords(cityName) {
  if (!cityName) return null;
  return CITY_COORDS.get(cityName.trim().toLowerCase()) || null;
}

// Distance à vol d'oiseau entre deux centres-villes, arrondie à 5 km près :
// une approximation volontaire (jamais de position exacte ni en temps réel).
function approximateDistanceKm(cityA, cityB) {
  const a = getCityCoords(cityA);
  const b = getCityCoords(cityB);
  if (!a || !b) return null;

  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.asin(Math.sqrt(h));

  return Math.round(km / 5) * 5;
}

module.exports = { getCityCoords, approximateDistanceKm };
