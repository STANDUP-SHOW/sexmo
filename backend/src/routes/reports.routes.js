const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');

const router = express.Router();

const reportSchema = z.object({
  targetProfileId: z.string(),
  reason: z.enum(['FAUX_PROFIL', 'CONTENU_ILLEGAL', 'MINEUR_SUSPECTE', 'SOLLICITATION_COMMERCIALE', 'HARCELEMENT', 'AUTRE']),
  details: z.string().max(1000).optional(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = reportSchema.parse(req.body);
    const targetProfile = await prisma.profile.findUnique({ where: { id: data.targetProfileId } });
    if (!targetProfile) return res.status(404).json({ error: 'Profil introuvable' });

    const report = await prisma.report.create({
      data: {
        reporterUserId: req.user.id,
        targetUserId: targetProfile.userId,
        reason: data.reason,
        details: data.details,
      },
    });

    // Signalement "mineur suspecté" ou "contenu illégal" : à brancher sur une
    // alerte immédiate à l'équipe de modération / autorités compétentes en prod.
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
});

router.post('/block/:profileId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const blockedProfileId = req.params.profileId;
    if (blockedProfileId === req.user.profile.id) return res.status(400).json({ error: 'Action impossible' });

    await prisma.blockedProfile.upsert({
      where: {
        blockerProfileId_blockedProfileId: {
          blockerProfileId: req.user.profile.id,
          blockedProfileId,
        },
      },
      update: {},
      create: { blockerProfileId: req.user.profile.id, blockedProfileId },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/block/:profileId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    await prisma.blockedProfile.deleteMany({
      where: { blockerProfileId: req.user.profile.id, blockedProfileId: req.params.profileId },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/blocked', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const rows = await prisma.blockedProfile.findMany({
      where: { blockerProfileId: req.user.profile.id },
      include: { blockedProfile: true },
    });
    res.json({ blocked: rows.map((r) => ({ id: r.blockedProfile.id, pseudo: r.blockedProfile.pseudo })) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
