const express = require('express');
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const GALLERY_LIMIT = 60;

router.get('/photos', requireAuth, async (req, res, next) => {
  try {
    const photos = await prisma.photo.findMany({
      where: {
        publishedToGallery: true,
        isPrivate: false,
        moderationStatus: 'APPROVED',
        profile: { visible: true },
      },
      include: { profile: { select: { id: true, pseudo: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      take: GALLERY_LIMIT,
    });
    res.json({
      photos: photos.map((p) => ({ id: p.id, url: p.url, createdAt: p.createdAt, profile: p.profile })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/videos', requireAuth, async (req, res, next) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        publishedToGallery: true,
        moderationStatus: 'APPROVED',
        profile: { visible: true },
      },
      include: { profile: { select: { id: true, pseudo: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      take: GALLERY_LIMIT,
    });
    res.json({
      videos: videos.map((v) => ({ id: v.id, url: v.url, createdAt: v.createdAt, profile: v.profile })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
