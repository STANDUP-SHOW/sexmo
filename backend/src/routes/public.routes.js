// Parcours des fiches sans compte : visiteurs non connectés. Toujours limité
// aux profils profile.visible = true, jamais les photos privées (celles-ci
// passent par le flux de demande d'accès entre membres, qui suppose un
// compte). Mêmes filtres que /api/browse, sans blocklist ni pagination fine.
const express = require('express');
const prisma = require('../config/prisma');
const { computeAge } = require('../utils/age');
const FRENCH_CITIES = require('../data/frenchCities');
const { toPublicProfile } = require('./profiles.routes');

const router = express.Router();

const PAGE_SIZE = 24;

router.get('/meta', (req, res) => {
  res.json({
    cities: FRENCH_CITIES,
    bodyTypes: ['ATHLETIQUE', 'SVELTE', 'MOYENNE', 'ENROBEE', 'RONDE'],
    eyeColors: ['MARRON', 'BLEU', 'VERT', 'GRIS', 'NOISETTE'],
  });
});

router.get('/profiles', async (req, res, next) => {
  try {
    const { city, gender, minAge, maxAge, bodyType, eyeColor, available, page = '1' } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * PAGE_SIZE;

    const where = {
      visible: true,
      ...(city ? { city } : {}),
      ...(gender ? { gender } : {}),
      ...(bodyType ? { bodyType } : {}),
      ...(eyeColor ? { eyeColor } : {}),
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
    const filtered = candidates.filter((p) => {
      const age = computeAge(p.user.birthDate);
      return age >= min && age <= max;
    });

    const page1 = filtered.slice(skip, skip + PAGE_SIZE);

    res.json({
      profiles: page1.map((p) => toPublicProfile(p, p.user.birthDate)),
      total: filtered.length,
      page: Number(page),
      pageSize: PAGE_SIZE,
    });
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

    res.json({ profile: toPublicProfile(profile, profile.user.birthDate) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
