const express = require('express');
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/auth');
const { cityRadiusMatch } = require('../utils/geo');

const router = express.Router();

const GALLERY_LIMIT = 60;
// On sur-récupère avant de filtrer ville/rayon en mémoire (comme browse/public),
// puis on retaille à GALLERY_LIMIT.
const GALLERY_FETCH_LIMIT = 500;

router.get('/photos', requireAuth, async (req, res, next) => {
  try {
    const { city, radiusKm } = req.query;
    const photos = await prisma.photo.findMany({
      where: {
        publishedToGallery: true,
        isPrivate: false,
        moderationStatus: 'APPROVED',
        profile: { visible: true },
      },
      include: { profile: { select: { id: true, pseudo: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      take: city ? GALLERY_FETCH_LIMIT : GALLERY_LIMIT,
    });
    const filtered = city ? photos.filter((p) => cityRadiusMatch(p.profile, city, Number(radiusKm) || 0)) : photos;
    res.json({
      photos: filtered.slice(0, GALLERY_LIMIT).map((p) => ({ id: p.id, url: p.url, createdAt: p.createdAt, profile: p.profile })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/videos', requireAuth, async (req, res, next) => {
  try {
    const { city, radiusKm } = req.query;
    const videos = await prisma.video.findMany({
      where: {
        publishedToGallery: true,
        moderationStatus: 'APPROVED',
        profile: { visible: true },
      },
      include: { profile: { select: { id: true, pseudo: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      take: city ? GALLERY_FETCH_LIMIT : GALLERY_LIMIT,
    });
    const filtered = city ? videos.filter((v) => cityRadiusMatch(v.profile, city, Number(radiusKm) || 0)) : videos;
    res.json({
      videos: filtered.slice(0, GALLERY_LIMIT).map((v) => ({ id: v.id, url: v.url, createdAt: v.createdAt, profile: v.profile })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
