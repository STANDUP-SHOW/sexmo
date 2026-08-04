const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');

const router = express.Router();

// Le visiteur demande à voir l'album privé d'un profil (pas photo par photo).
router.post('/request/:profileId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const ownerProfileId = req.params.profileId;
    const requesterProfileId = req.user.profile.id;
    if (ownerProfileId === requesterProfileId) return res.status(400).json({ error: 'Action impossible sur son propre profil' });

    const owner = await prisma.profile.findUnique({ where: { id: ownerProfileId } });
    if (!owner || !owner.visible) return res.status(404).json({ error: 'Profil introuvable' });

    const grant = await prisma.photoAccessGrant.upsert({
      where: { ownerProfileId_requesterProfileId: { ownerProfileId, requesterProfileId } },
      // Une demande déjà refusée peut être retentée ; une demande déjà
      // approuvée n'est jamais rétrogradée par un nouvel appel de cette route.
      update: {},
      create: { ownerProfileId, requesterProfileId, status: 'PENDING' },
    });

    res.status(201).json({ grant });
  } catch (err) {
    next(err);
  }
});

router.get('/status/:profileId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const grant = await prisma.photoAccessGrant.findUnique({
      where: {
        ownerProfileId_requesterProfileId: {
          ownerProfileId: req.params.profileId,
          requesterProfileId: req.user.profile.id,
        },
      },
    });
    res.json({ status: grant?.status || null });
  } catch (err) {
    next(err);
  }
});

router.get('/requests', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const requests = await prisma.photoAccessGrant.findMany({
      where: { ownerProfileId: req.user.profile.id, status: 'PENDING' },
      include: { requesterProfile: { select: { id: true, pseudo: true, city: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

const reviewSchema = z.object({ status: z.enum(['APPROVED', 'DENIED']) });

router.patch('/requests/:id', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const { status } = reviewSchema.parse(req.body);
    const grant = await prisma.photoAccessGrant.findUnique({ where: { id: req.params.id } });
    if (!grant || grant.ownerProfileId !== req.user.profile.id) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }
    const updated = await prisma.photoAccessGrant.update({
      where: { id: grant.id },
      data: { status, respondedAt: new Date() },
    });
    res.json({ grant: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
