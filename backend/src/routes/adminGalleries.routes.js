// Galeries du back-office : collections nommées de photos, import en masse
// avec nommage intelligent "pseudo-genre-ville-date.ext" (date en AAAAMMJJ,
// sans tiret interne, pour rester distinguable des autres segments) —
// chaque photo devient une entrée avec ses métadonnées prêtes à trier.
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const mediaStorage = require('../services/mediaStorage');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Format non supporté (jpeg, png ou webp uniquement)'));
    cb(null, true);
  },
});

function parseFlexDate(token) {
  if (/^\d{8}$/.test(token)) {
    const dt = new Date(`${token.slice(0, 4)}-${token.slice(4, 6)}-${token.slice(6, 8)}T00:00:00Z`);
    return isNaN(dt) ? null : dt;
  }
  const dt = new Date(token);
  return isNaN(dt.getTime()) ? null : dt;
}

// "pseudo-genre-ville-date.ext" — le pseudo peut lui-même contenir des
// tirets, on prend donc les 3 derniers segments comme genre/ville/date et
// tout le reste comme pseudo.
function parseGalleryFilename(originalname) {
  const ext = path.extname(originalname);
  const stem = path.basename(originalname, ext);
  const parts = stem.split('-').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 4) {
    return { authorPseudo: stem || 'Anonyme', genre: null, ville: null, publishedAt: null };
  }
  const dateToken = parts[parts.length - 1];
  const ville = parts[parts.length - 2];
  const genre = parts[parts.length - 3];
  const authorPseudo = parts.slice(0, parts.length - 3).join('-') || 'Anonyme';
  return { authorPseudo, genre, ville, publishedAt: parseFlexDate(dateToken) };
}

router.get('/', async (req, res, next) => {
  try {
    const galleries = await prisma.gallery.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { photos: true } } },
    });
    res.json({ galleries });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nom de galerie requis' });
    const gallery = await prisma.gallery.create({ data: { name } });
    res.status(201).json({ gallery });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.gallery.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const SORT_FIELDS = { date: 'publishedAt', genre: 'genre', pseudo: 'authorPseudo', ville: 'ville' };

router.get('/:id/photos', async (req, res, next) => {
  try {
    const sortKey = SORT_FIELDS[req.query.sort] || 'publishedAt';
    const photos = await prisma.galleryPhoto.findMany({
      where: { galleryId: req.params.id },
      orderBy: { [sortKey]: sortKey === 'publishedAt' ? 'desc' : 'asc' },
    });
    res.json({ photos });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/photos/batch', upload.array('photos', 500), async (req, res, next) => {
  try {
    const gallery = await prisma.gallery.findUnique({ where: { id: req.params.id } });
    if (!gallery) return res.status(404).json({ error: 'Galerie introuvable' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const created = [];
    for (const file of req.files) {
      const meta = parseGalleryFilename(file.originalname);
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${crypto.randomUUID()}${ext}`;
      await mediaStorage.uploadBuffer(file.buffer, filename);
      const photo = await prisma.galleryPhoto.create({
        data: {
          galleryId: gallery.id,
          url: `/media/gallery-photos/${filename}`,
          authorPseudo: meta.authorPseudo,
          genre: meta.genre,
          ville: meta.ville,
          ...(meta.publishedAt ? { publishedAt: meta.publishedAt } : {}),
        },
      });
      created.push(photo);
    }

    res.status(201).json({ photos: created, notice: `${created.length} photo(s) importée(s) dans « ${gallery.name} ».` });
  } catch (err) {
    next(err);
  }
});

router.delete('/:galleryId/photos/:photoId', async (req, res, next) => {
  try {
    const photo = await prisma.galleryPhoto.findUnique({ where: { id: req.params.photoId } });
    if (!photo || photo.galleryId !== req.params.galleryId) return res.status(404).json({ error: 'Photo introuvable' });
    await prisma.galleryPhoto.delete({ where: { id: photo.id } });
    await mediaStorage.deleteFile(path.basename(photo.url)).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
