const express = require('express');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { computeAge } = require('../utils/age');
const { profileMatchesCity } = require('../utils/geo');
const FRENCH_CITIES = require('../data/frenchCities');
const { toPublicProfile, likeCountsFor } = require('./profiles.routes');

const router = express.Router();

const GENDERS = ['HOMME', 'FEMME', 'COUPLE_HOMME_FEMME', 'COUPLE_HOMME_HOMME', 'COUPLE_FEMME_FEMME', 'TRANS', 'NON_BINAIRE', 'AUTRE'];
const ORIENTATIONS = ['HETERO', 'HOMO', 'BI', 'CURIEUX', 'PANSEXUEL', 'AUTRE'];
const BODY_TYPES = ['ATHLETIQUE', 'SVELTE', 'MOYENNE', 'ENROBEE', 'RONDE'];
const EYE_COLORS = ['MARRON', 'BLEU', 'VERT', 'GRIS', 'NOISETTE'];
const AD_CATEGORIES = ['EPHEMERE', 'ECHANGISME', 'PLURALISME', 'VOYEURISME', 'GROUPE'];

router.get('/meta', (req, res) => {
  res.json({ cities: FRENCH_CITIES, genders: GENDERS, orientations: ORIENTATIONS, bodyTypes: BODY_TYPES, eyeColors: EYE_COLORS, adCategories: AD_CATEGORIES });
});

router.get('/', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const { city, gender, orientation, minAge, maxAge, bodyType, eyeColor, available, adCategory, page = '1' } = req.query;
    const pageSize = 24;
    const skip = (Math.max(1, Number(page)) - 1) * pageSize;

    const blockedRows = await prisma.blockedProfile.findMany({
      where: {
        OR: [{ blockerProfileId: req.user.profile.id }, { blockedProfileId: req.user.profile.id }],
      },
    });
    const blockedIds = new Set(
      blockedRows.map((b) => (b.blockerProfileId === req.user.profile.id ? b.blockedProfileId : b.blockerProfileId))
    );

    const where = {
      visible: true,
      id: { notIn: [req.user.profile.id, ...blockedIds] },
      ...(gender ? { gender } : {}),
      ...(bodyType ? { bodyType } : {}),
      ...(eyeColor ? { eyeColor } : {}),
      ...(adCategory ? { adCategory } : {}),
      ...(available === 'true' ? { available: true } : {}),
    };
    if (orientation) where.orientation = orientation;

    const candidates = await prisma.profile.findMany({
      where,
      include: { photos: true, user: { select: { birthDate: true } } },
      orderBy: { lastActiveAt: 'desc' },
      take: 500, // filtré davantage en mémoire (âge, ville/rayon), puis paginé
    });

    const min = minAge ? Number(minAge) : 18;
    const max = maxAge ? Number(maxAge) : 99;

    const filtered = candidates.filter((p) => {
      const age = computeAge(p.user.birthDate);
      return age >= min && age <= max && profileMatchesCity(p, city);
    });

    const page1 = filtered.slice(skip, skip + pageSize);
    const likeCounts = await likeCountsFor(page1.map((p) => p.id));

    res.json({
      profiles: page1.map((p) => ({ ...toPublicProfile(p, p.user.birthDate), likeCount: likeCounts.get(p.id) || 0 })),
      total: filtered.length,
      page: Number(page),
      pageSize,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
