const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

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
    const [users, profiles, pendingPhotos, pendingReports] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.photo.count({ where: { moderationStatus: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);
    res.json({ users, profiles, pendingPhotos, pendingReports });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
