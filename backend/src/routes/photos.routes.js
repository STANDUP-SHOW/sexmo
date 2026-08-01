const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');

const router = express.Router();

const MAX_PHOTOS_PER_PROFILE = 20;
const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
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

    const count = await prisma.photo.count({ where: { profileId: req.user.profile.id } });
    if (count >= MAX_PHOTOS_PER_PROFILE) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: `Maximum ${MAX_PHOTOS_PER_PROFILE} photos par profil` });
    }

    const photo = await prisma.photo.create({
      data: {
        profileId: req.user.profile.id,
        url: `/uploads/${req.file.filename}`,
        isPrivate: req.body.isPrivate === 'true',
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
    const filePath = path.join(uploadDir, path.basename(photo.url));
    fs.unlink(filePath, () => {});
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
    res.json({ photos });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
