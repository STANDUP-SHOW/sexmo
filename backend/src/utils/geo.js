const FRENCH_CITIES = require('../data/frenchCities');
const CITY_TO_DEPARTMENT = require('../data/cityToDepartment.json');
const CITY_TO_COORDS = require('../data/cityToCoords.json');

const CITY_COORDS = new Map(
  FRENCH_CITIES.map((c) => [c.name.trim().toLowerCase(), { lat: c.lat, lng: c.lng }])
);

function normalizeCityKey(name) {
  return String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function getCityCoords(cityName) {
  if (!cityName) return null;
  return CITY_COORDS.get(cityName.trim().toLowerCase()) || CITY_TO_COORDS[normalizeCityKey(cityName)] || null;
}

// Code département (2-3 chiffres) pour une ville donnée, utilisé pour
// pré-sélectionner le salon Sexmo Tchat du département d'un membre depuis
// son profil — dérivé de la base officielle des communes (34 000+ entrées),
// pas d'une simple liste de grandes villes.
function departmentForCity(cityName) {
  if (!cityName) return null;
  return CITY_TO_DEPARTMENT[normalizeCityKey(cityName)] || null;
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

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// Ville connue la plus proche d'une position GPS brute (utilisé pour classer
// automatiquement une annonce quand le membre active la géolocalisation).
function nearestCity(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const c of FRENCH_CITIES) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

// Un profil correspond à un filtre "ville" soit par correspondance exacte,
// soit — s'il a activé la géolocalisation et étendu son rayon — si la ville
// recherchée se trouve dans ce rayon autour de sa position.
function profileMatchesCity(profile, cityFilter) {
  if (!cityFilter) return true;
  if (profile.city === cityFilter) return true;
  if (!profile.useGeolocation || profile.latitude == null || profile.longitude == null || !profile.radiusKm) return false;
  const target = getCityCoords(cityFilter);
  if (!target) return false;
  return haversineKm(profile.latitude, profile.longitude, target.lat, target.lng) <= profile.radiusKm;
}

// Recherche "autour de {ville}, {rayon} km" pilotée par le visiteur (carte
// interactive) — indépendante du réglage "useGeolocation" du profil, qui lui
// ne sert qu'à l'annonce du membre lui-même. Se base sur la ville déclarée
// du profil (résolue via la base des 34 000+ communes), pas sur une position
// GPS en temps réel.
function cityRadiusMatch(profile, cityFilter, radiusKm) {
  if (!cityFilter) return true;
  if (!radiusKm) return profile.city === cityFilter;
  if (profile.city === cityFilter) return true;
  const center = getCityCoords(cityFilter);
  const point = getCityCoords(profile.city);
  if (!center || !point) return false;
  return haversineKm(center.lat, center.lng, point.lat, point.lng) <= radiusKm;
}

module.exports = {
  getCityCoords, approximateDistanceKm, haversineKm, nearestCity,
  profileMatchesCity, departmentForCity, cityRadiusMatch,
};
