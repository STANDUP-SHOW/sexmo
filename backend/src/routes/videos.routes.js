const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const mediaStorage = require('../services/mediaStorage');

const router = express.Router();

const MAX_VIDEOS_PER_PROFILE = 3;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Format non supporté (mp4, mov ou webm uniquement)'));
    }
    cb(null, true);
  },
});

router.post('/', requireAuth, requireProfile, upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const count = await prisma.video.count({ where: { profileId: req.user.profile.id } });
    if (count >= MAX_VIDEOS_PER_PROFILE) {
      return res.status(400).json({ error: `Maximum ${MAX_VIDEOS_PER_PROFILE} vidéos par profil` });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp4';
    const filename = `${crypto.randomUUID()}${ext}`;
    await mediaStorage.uploadBuffer(req.file.buffer, filename);

    const video = await prisma.video.create({
      data: {
        profileId: req.user.profile.id,
        url: `/media/videos/${filename}`,
        position: count,
        publishedToGallery: req.body.publishedToGallery === 'true',
        moderationStatus: 'PENDING',
      },
    });

    res.status(201).json({ video });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/gallery', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video || video.profileId !== req.user.profile.id) {
      return res.status(404).json({ error: 'Vidéo introuvable' });
    }
    const updated = await prisma.video.update({
      where: { id: video.id },
      data: { publishedToGallery: !!req.body.publishedToGallery },
    });
    res.json({ video: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video || video.profileId !== req.user.profile.id) {
      return res.status(404).json({ error: 'Vidéo introuvable' });
    }
    await prisma.video.delete({ where: { id: video.id } });
    await mediaStorage.deleteFile(path.basename(video.url)).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const videos = await prisma.video.findMany({
      where: { profileId: req.user.profile.id },
      orderBy: { position: 'asc' },
    });
    res.json({ videos, maxVideos: MAX_VIDEOS_PER_PROFILE });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
