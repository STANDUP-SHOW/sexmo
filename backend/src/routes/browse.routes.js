const express = require('express');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { computeAge } = require('../utils/age');
const FRENCH_CITIES = require('../data/frenchCities');
const { toPublicProfile } = require('./profiles.routes');

const router = express.Router();

const GENDERS = ['HOMME', 'FEMME', 'COUPLE_HOMME_FEMME', 'COUPLE_HOMME_HOMME', 'COUPLE_FEMME_FEMME', 'TRANS', 'NON_BINAIRE', 'AUTRE'];
const ORIENTATIONS = ['HETERO', 'HOMO', 'BI', 'CURIEUX', 'AUTRE'];

router.get('/meta', (req, res) => {
  res.json({ cities: FRENCH_CITIES, genders: GENDERS, orientations: ORIENTATIONS });
});

router.get('/', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const { city, gender, orientation, minAge, maxAge, page = '1' } = req.query;
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
      ...(city ? { city } : {}),
      ...(gender ? { gender } : {}),
    };
    if (orientation) where.orientation = orientation;

    const candidates = await prisma.profile.findMany({
      where,
      include: { photos: true, user: { select: { birthDate: true } } },
      orderBy: { lastActiveAt: 'desc' },
      take: 500, // filtered further in-memory by age, then paginated
    });

    const min = minAge ? Number(minAge) : 18;
    const max = maxAge ? Number(maxAge) : 99;

    const filtered = candidates.filter((p) => {
      const age = computeAge(p.user.birthDate);
      return age >= min && age <= max;
    });

    const page1 = filtered.slice(skip, skip + pageSize);

    res.json({
      profiles: page1.map((p) => toPublicProfile(p, p.user.birthDate)),
      total: filtered.length,
      page: Number(page),
      pageSize,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
