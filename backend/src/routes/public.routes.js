// Parcours des fiches sans compte : visiteurs non connectés. Toujours limité
// aux profils profile.visible = true, jamais les photos privées (celles-ci
// passent par le flux de demande d'accès entre membres, qui suppose un
// compte). Mêmes filtres que /api/browse, sans blocklist ni pagination fine.
const express = require('express');
const prisma = require('../config/prisma');
const { computeAge } = require('../utils/age');
const { profileMatchesCity, cityRadiusMatch, getCityCoords, departmentForCity, nearestCity } = require('../utils/geo');
const FRENCH_CITIES = require('../data/frenchCities');
const { toPublicProfile, likeCountsFor } = require('./profiles.routes');

const router = express.Router();

const PAGE_SIZE = 24;

router.get('/meta', (req, res) => {
  res.json({
    cities: FRENCH_CITIES,
    bodyTypes: ['ATHLETIQUE', 'SVELTE', 'MOYENNE', 'ENROBEE', 'RONDE'],
    eyeColors: ['MARRON', 'BLEU', 'VERT', 'GRIS', 'NOISETTE'],
    adCategories: ['EPHEMERE', 'ECHANGISME', 'PLURALISME', 'VOYEURISME', 'GROUPE'],
    orientations: ['HETERO', 'HOMO', 'BI', 'CURIEUX', 'PANSEXUEL', 'AUTRE'],
  });
});

// Résolution position GPS -> ville connue la plus proche, utilisable sans
// compte (ex. bouton "Me géolocaliser" du Sexmo Tchat) — jamais de position
// stockée ni renvoyée, uniquement le nom de ville résolu.
router.get('/nearest-city', (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'Coordonnées invalides' });
  const nearest = nearestCity(lat, lng);
  if (!nearest) return res.status(404).json({ error: 'Aucune ville trouvée' });
  res.json({ city: nearest.name, region: nearest.region });
});

router.get('/profiles', async (req, res, next) => {
  try {
    const { city, radiusKm, gender, orientation, minAge, maxAge, bodyType, eyeColor, available, adCategory, page = '1' } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * PAGE_SIZE;

    const where = {
      visible: true,
      ...(gender ? { gender } : {}),
      ...(orientation ? { orientation } : {}),
      ...(bodyType ? { bodyType } : {}),
      ...(eyeColor ? { eyeColor } : {}),
      ...(adCategory ? { adCategory } : {}),
      ...(available === 'true' ? { available: true } : {}),
    };

    const candidates = await prisma.profile.findMany({
      where,
      include: { photos: true, user: { select: { birthDate: true } } },
      orderBy: { lastActiveAt: 'desc' },
      take: 500,
    });

    const min = minAge ? Number(minAge) : 18;
    const max = maxAge ? Number(maxAge) : 99;
    // radiusKm : recherche "autour de {city}" pilotée par le visiteur (carte),
    // indépendante du réglage de géolocalisation du profil lui-même.
    const filtered = candidates.filter((p) => {
      const age = computeAge(p.user.birthDate);
      const matchesCity = radiusKm ? cityRadiusMatch(p, city, Number(radiusKm)) : profileMatchesCity(p, city);
      return age >= min && age <= max && matchesCity;
    });

    const page1 = filtered.slice(skip, skip + PAGE_SIZE);
    const likeCounts = await likeCountsFor(page1.map((p) => p.id));

    res.json({
      profiles: page1.map((p) => ({ ...toPublicProfile(p, p.user.birthDate), likeCount: likeCounts.get(p.id) || 0 })),
      total: filtered.length,
      page: Number(page),
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    next(err);
  }
});

// Pour le bloc carte interactive : coordonnées résolues côté serveur (même
// base que le comptage, pour que la pastille et le chiffre affiché soient
// toujours cohérents) + nombre de profils visibles dans le rayon choisi.
router.get('/map-stats', async (req, res, next) => {
  try {
    const { city, radiusKm = '50' } = req.query;
    if (!city) return res.status(400).json({ error: 'Ville requise' });

    const center = getCityCoords(city);
    if (!center) return res.status(404).json({ error: 'Ville inconnue' });

    const candidates = await prisma.profile.findMany({
      where: { visible: true },
      select: { id: true, city: true },
      take: 5000,
    });
    const radius = Number(radiusKm);
    const count = candidates.filter((p) => cityRadiusMatch(p, city, radius)).length;

    res.json({ city, lat: center.lat, lng: center.lng, radiusKm: radius, count, department: departmentForCity(city) });
  } catch (err) {
    next(err);
  }
});

// Résolution d'une URL personnalisée (sexmo.fr/<slug>) vers l'id du profil —
// le frontend redirige ensuite vers la fiche appropriée selon la connexion.
router.get('/profiles/slug/:slug', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { slug: req.params.slug.toLowerCase() } });
    if (!profile || !profile.visible) return res.status(404).json({ error: 'Profil introuvable' });
    res.json({ id: profile.id, pseudo: profile.pseudo });
  } catch (err) {
    next(err);
  }
});

router.get('/profiles/:id', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { photos: true, videos: true, user: true },
    });
    if (!profile || !profile.visible) return res.status(404).json({ error: 'Profil introuvable' });

    const likeCounts = await likeCountsFor([profile.id]);
    res.json({ profile: { ...toPublicProfile(profile, profile.user.birthDate), likeCount: likeCounts.get(profile.id) || 0 } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
