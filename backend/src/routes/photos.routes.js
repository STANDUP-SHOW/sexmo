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
        // Une photo privée ne peut jamais atterrir dans la galerie publique du site.
        publishedToGallery: !isPrivate && req.body.publishedToGallery === 'true',
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

// Import multiple (sélection de plusieurs fichiers ou d'un dossier entier
// depuis l'explorateur du navigateur) : n'accepte que ce qui reste de quota
// (5 photos publiques / 20 privées par profil), le reste est ignoré et
// signalé dans la réponse plutôt que de faire échouer tout l'envoi.
router.post('/batch', requireAuth, requireProfile, upload.array('photos', 25), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const isPrivate = req.body.isPrivate === 'true';
    const max = isPrivate ? MAX_PRIVATE_PHOTOS : MAX_PUBLIC_PHOTOS;
    let count = await prisma.photo.count({ where: { profileId: req.user.profile.id, isPrivate } });

    const created = [];
    let skipped = 0;

    for (const file of req.files) {
      if (count >= max) { skipped++; continue; }

      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${crypto.randomUUID()}${ext}`;
      await mediaStorage.uploadBuffer(file.buffer, filename);

      const photo = await prisma.photo.create({
        data: {
          profileId: req.user.profile.id,
          url: `/media/photos/${filename}`,
          isPrivate,
          position: count,
          publishedToGallery: false,
          moderationStatus: 'PENDING',
        },
      });
      created.push(photo);
      count++;
    }

    res.status(201).json({
      photos: created,
      skipped,
      notice: skipped > 0
        ? `${created.length} photo(s) envoyée(s), ${skipped} ignorée(s) (limite de ${max} photos ${isPrivate ? 'privées' : 'publiques'} atteinte).`
        : `${created.length} photo(s) envoyée(s).`,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/gallery', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
    if (!photo || photo.profileId !== req.user.profile.id) {
      return res.status(404).json({ error: 'Photo introuvable' });
    }
    if (photo.isPrivate && req.body.publishedToGallery) {
      return res.status(400).json({ error: 'Une photo privée ne peut pas être publiée dans la galerie du site' });
    }
    const updated = await prisma.photo.update({
      where: { id: photo.id },
      data: { publishedToGallery: !!req.body.publishedToGallery },
    });
    res.json({ photo: updated });
  } catch (err) {
    next(err);
  }
});

// Met une photo publique en position 0 : c'est elle qui sert de vignette
// principale (cartes de découverte/parcours/annonces).
router.patch('/:id/feature', requireAuth, async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
    const isOwner = photo && req.user.profile && photo.profileId === req.user.profile.id;
    const isAdmin = req.user.role === 'ADMIN';
    if (!photo || (!isOwner && !isAdmin)) {
      return res.status(404).json({ error: 'Photo introuvable' });
    }
    if (photo.isPrivate) {
      return res.status(400).json({ error: 'Seule une photo publique peut être mise en avant' });
    }
    const siblings = await prisma.photo.findMany({
      where: { profileId: photo.profileId, isPrivate: false },
      orderBy: { position: 'asc' },
    });
    const reordered = [photo.id, ...siblings.filter((p) => p.id !== photo.id).map((p) => p.id)];
    await prisma.$transaction(
      reordered.map((id, index) => prisma.photo.update({ where: { id }, data: { position: index } }))
    );
    const updated = await prisma.photo.findMany({ where: { profileId: photo.profileId }, orderBy: { position: 'asc' } });
    res.json({ photos: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
    const isOwner = photo && req.user.profile && photo.profileId === req.user.profile.id;
    const isAdmin = req.user.role === 'ADMIN';
    if (!photo || (!isOwner && !isAdmin)) {
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
