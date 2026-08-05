const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getSettings } = require('./settings.routes');

const router = express.Router();

router.use(requireAuth, requireAdmin);

const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `logo-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Format non supporté (jpeg, png, webp ou svg)'));
    cb(null, true);
  },
});

router.get('/photos/pending', async (req, res, next) => {
  try {
    const photos = await prisma.photo.findMany({
      where: { moderationStatus: 'PENDING' },
      include: { profile: { select: { pseudo: true, id: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ photos });
  } catch (err) {
    next(err);
  }
});

const moderateSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED']) });

router.patch('/photos/:id', async (req, res, next) => {
  try {
    const { status } = moderateSchema.parse(req.body);
    const photo = await prisma.photo.update({ where: { id: req.params.id }, data: { moderationStatus: status } });
    res.json({ photo });
  } catch (err) {
    next(err);
  }
});

const batchModerateSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  status: z.enum(['APPROVED', 'REJECTED']),
});

router.post('/photos/batch', async (req, res, next) => {
  try {
    const { ids, status } = batchModerateSchema.parse(req.body);
    const result = await prisma.photo.updateMany({ where: { id: { in: ids } }, data: { moderationStatus: status } });
    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
});

router.post('/videos/batch', async (req, res, next) => {
  try {
    const { ids, status } = batchModerateSchema.parse(req.body);
    const result = await prisma.video.updateMany({ where: { id: { in: ids } }, data: { moderationStatus: status } });
    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
});

router.get('/videos/pending', async (req, res, next) => {
  try {
    const videos = await prisma.video.findMany({
      where: { moderationStatus: 'PENDING' },
      include: { profile: { select: { pseudo: true, id: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ videos });
  } catch (err) {
    next(err);
  }
});

router.patch('/videos/:id', async (req, res, next) => {
  try {
    const { status } = moderateSchema.parse(req.body);
    const video = await prisma.video.update({ where: { id: req.params.id }, data: { moderationStatus: status } });
    res.json({ video });
  } catch (err) {
    next(err);
  }
});

router.get('/reports', async (req, res, next) => {
  try {
    const status = req.query.status || 'PENDING';
    const reports = await prisma.report.findMany({
      where: { status },
      include: {
        reporterUser: { select: { email: true } },
        targetUser: { select: { email: true, status: true, profile: { select: { pseudo: true, id: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

const reviewSchema = z.object({
  status: z.enum(['REVIEWED', 'ACTION_TAKEN', 'DISMISSED']),
  banTarget: z.boolean().optional(),
});

router.patch('/reports/:id', async (req, res, next) => {
  try {
    const { status, banTarget } = reviewSchema.parse(req.body);
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, reviewedAt: new Date() },
    });

    if (banTarget) {
      await prisma.user.update({ where: { id: report.targetUserId }, data: { status: 'BANNED' } });
    }

    res.json({ report });
  } catch (err) {
    next(err);
  }
});

const userStatusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']) });

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = userStatusSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status } });
    res.json({ user: { id: user.id, email: user.email, status: user.status } });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [users, profiles, pendingPhotos, pendingVideos, pendingReports, pendingComments, pendingTestimonials] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.photo.count({ where: { moderationStatus: 'PENDING' } }),
      prisma.video.count({ where: { moderationStatus: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.comment.count({ where: { status: 'PENDING' } }),
      prisma.testimonial.count({ where: { status: 'PENDING' } }),
    ]);
    res.json({ users, profiles, pendingPhotos, pendingVideos, pendingReports, pendingComments, pendingTestimonials });
  } catch (err) {
    next(err);
  }
});

// --- Pages (CMS) ---

router.get('/pages', async (req, res, next) => {
  try {
    const pages = await prisma.page.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json({ pages });
  } catch (err) {
    next(err);
  }
});

const pageSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug invalide (lettres minuscules, chiffres, tirets)'),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().optional(),
  images: z.array(z.string()).optional(),
});

router.post('/pages', async (req, res, next) => {
  try {
    const data = pageSchema.parse(req.body);
    const page = await prisma.page.create({ data });
    res.status(201).json({ page });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ce slug est déjà utilisé par une autre page.' });
    next(err);
  }
});

router.patch('/pages/:id', async (req, res, next) => {
  try {
    const data = pageSchema.partial().parse(req.body);
    const page = await prisma.page.update({ where: { id: req.params.id }, data });
    res.json({ page });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Ce slug est déjà utilisé par une autre page.' });
    next(err);
  }
});

router.delete('/pages/:id', async (req, res, next) => {
  try {
    await prisma.page.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const pageImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `page-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Format non supporté (jpeg, png ou webp)'));
    cb(null, true);
  },
});

// Galerie d'une page : upload multiple, chaque image ajoutée au tableau
// `images`. Suppression via PATCH /pages/:id avec le tableau `images` réduit.
router.post('/pages/:id/images', pageImageUpload.array('images', 30), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const page = await prisma.page.findUnique({ where: { id: req.params.id } });
    if (!page) return res.status(404).json({ error: 'Page introuvable' });

    const newUrls = req.files.map((f) => `/uploads/${f.filename}`);
    const updated = await prisma.page.update({
      where: { id: page.id },
      data: { images: [...page.images, ...newUrls] },
    });
    res.status(201).json({ page: updated });
  } catch (err) {
    next(err);
  }
});

// --- Commentaires ---

router.get('/comments/pending', async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { status: 'PENDING' },
      include: { page: { select: { title: true, slug: true } }, authorUser: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

router.patch('/comments/:id', async (req, res, next) => {
  try {
    const { status } = moderateSchema.parse(req.body);
    const comment = await prisma.comment.update({ where: { id: req.params.id }, data: { status } });
    res.json({ comment });
  } catch (err) {
    next(err);
  }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Avis / témoignages ---

router.get('/testimonials', async (req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      include: { authorUser: { select: { email: true, profile: { select: { pseudo: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ testimonials });
  } catch (err) {
    next(err);
  }
});

router.get('/testimonials/pending', async (req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { status: 'PENDING' },
      include: { authorUser: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ testimonials });
  } catch (err) {
    next(err);
  }
});

// Un avis créé depuis le back-office doit être rattaché à un membre existant
// et réel (recherché par e-mail) — jamais un auteur inventé, ce qui
// constituerait un faux avis client.
const adminCreateTestimonialSchema = z.object({
  authorEmail: z.string().email(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1).max(1000),
});

router.post('/testimonials', async (req, res, next) => {
  try {
    const data = adminCreateTestimonialSchema.parse(req.body);
    const author = await prisma.user.findUnique({ where: { email: data.authorEmail } });
    if (!author) return res.status(404).json({ error: 'Aucun membre trouvé avec cet e-mail' });

    const testimonial = await prisma.testimonial.create({
      data: {
        authorUserId: author.id,
        rating: data.rating,
        content: data.content,
        status: 'APPROVED',
      },
    });
    res.status(201).json({ testimonial });
  } catch (err) {
    next(err);
  }
});

const testimonialPatchSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  adminReply: z.string().max(1000).nullable().optional(),
});

router.patch('/testimonials/:id', async (req, res, next) => {
  try {
    const data = testimonialPatchSchema.parse(req.body);
    const testimonial = await prisma.testimonial.update({ where: { id: req.params.id }, data });
    res.json({ testimonial });
  } catch (err) {
    next(err);
  }
});

router.delete('/testimonials/:id', async (req, res, next) => {
  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Réglages du site (nom, slogan, logo) ---

const settingsSchema = z.object({
  siteName: z.string().min(1).max(60).optional(),
  tagline: z.string().min(1).max(200).optional(),
});

router.patch('/settings', async (req, res, next) => {
  try {
    const data = settingsSchema.parse(req.body);
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.post('/settings/logo', logoUpload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const previous = await getSettings();
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: { logoUrl: `/uploads/${req.file.filename}` },
      create: { id: 'singleton', logoUrl: `/uploads/${req.file.filename}` },
    });

    if (previous.logoUrl) {
      fs.unlink(path.join(uploadDir, path.basename(previous.logoUrl)), () => {});
    }

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
