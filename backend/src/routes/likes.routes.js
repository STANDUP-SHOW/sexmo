const express = require('express');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');

const router = express.Router();

router.post('/:profileId', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const myId = req.user.profile.id;
    const targetId = req.params.profileId;
    if (targetId === myId) return res.status(400).json({ error: 'Action impossible sur son propre profil' });

    const target = await prisma.profile.findUnique({ where: { id: targetId } });
    if (!target || !target.visible) return res.status(404).json({ error: 'Profil introuvable' });

    await prisma.like.upsert({
      where: { fromProfileId_toProfileId: { fromProfileId: myId, toProfileId: targetId } },
      update: {},
      create: { fromProfileId: myId, toProfileId: targetId },
    });

    const reciprocal = await prisma.like.findUnique({
      where: { fromProfileId_toProfileId: { fromProfileId: targetId, toProfileId: myId } },
    });

    if (!reciprocal) {
      return res.json({ matched: false });
    }

    const [profileAId, profileBId] = [myId, targetId].sort();
    const match = await prisma.match.upsert({
      where: { profileAId_profileBId: { profileAId, profileBId } },
      update: {},
      create: { profileAId, profileBId },
    });

    const conversation = await prisma.conversation.upsert({
      where: { matchId: match.id },
      update: {},
      create: { matchId: match.id },
    });

    const io = req.app.get('io');
    io?.to(`profile:${targetId}`).emit('match:new', { matchId: match.id, conversationId: conversation.id });

    res.json({ matched: true, matchId: match.id, conversationId: conversation.id });
  } catch (err) {
    next(err);
  }
});

router.get('/received', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const likes = await prisma.like.findMany({
      where: { toProfileId: req.user.profile.id },
      include: { fromProfile: { include: { photos: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      profiles: likes.map((l) => ({
        id: l.fromProfile.id,
        pseudo: l.fromProfile.pseudo,
        city: l.fromProfile.city,
        photo: l.fromProfile.photos.find((p) => p.moderationStatus === 'APPROVED')?.url || null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
