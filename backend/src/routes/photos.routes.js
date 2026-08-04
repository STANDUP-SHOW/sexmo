const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const mediaStorage = require('../services/mediaStorage');

const router = express.Router();

const MAX_PUBLIC_PHOTOS = 5;
const MAX_PRIVATE_PHOTOS = 20;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Format non supporté (jpeg, png ou webp uniquement)'));
    }
    cb(null, true);
  },
});

router.post('/', requireAuth, requireProfile, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const isPrivate = req.body.isPrivate === 'true';
    const count = await prisma.photo.count({ where: { profileId: req.user.profile.id, isPrivate } });
    const max = isPrivate ? MAX_PRIVATE_PHOTOS : MAX_PUBLIC_PHOTOS;
    if (count >= max) {
      return res.status(400).json({
        error: isPrivate
          ? `Maximum ${MAX_PRIVATE_PHOTOS} photos privées par profil`
          : `Maximum ${MAX_PUBLIC_PHOTOS} photos publiques par profil`,
      });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    await mediaStorage.uploadBuffer(req.file.buffer, filename);

    const photo = await prisma.photo.create({
      data: {
        profileId: req.user.profile.id,
        url: `/media/photos/${filename}`,
        isPrivate,
        position: count,
        // Toute photo passe par une file de modération manuelle avant d'être
        // visible publiquement (voir /api/admin/photos). À terme, brancher un
        // scanner automatique (contenu illégal / mineurs) en amont de la queue.
        moderationStatus: 'PENDING',
      },
    });

    res.status(201).json({ photo });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
    if (!photo || photo.profileId !== req.user.profile.id) {
      return res.status(404).json({ error: 'Photo introuvable' });
    }
    await prisma.photo.delete({ where: { id: photo.id } });
    await mediaStorage.deleteFile(path.basename(photo.url)).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/mine', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const photos = await prisma.photo.findMany({
      where: { profileId: req.user.profile.id },
      orderBy: { position: 'asc' },
    });
    res.json({
      photos,
      quotas: { maxPublic: MAX_PUBLIC_PHOTOS, maxPrivate: MAX_PRIVATE_PHOTOS },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
