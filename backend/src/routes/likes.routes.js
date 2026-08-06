const express = require('express');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { isOnline } = require('../state/onlinePresence');
const { departmentForCity } = require('../utils/geo');

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

    const io = req.app.get('io');

    if (!reciprocal) {
      // Pas encore réciproque : on prévient quand même la personne aimée,
      // façon "X vous aime bien, et vous ?" — elle peut liker en retour
      // depuis la notification pour transformer ça en match immédiatement.
      io?.to(`profile:${targetId}`).emit('like:received', { fromProfileId: myId, fromPseudo: req.user.profile.pseudo });
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

    io?.to(`profile:${targetId}`).emit('match:new', {
      matchId: match.id,
      conversationId: conversation.id,
      fromPseudo: req.user.profile.pseudo,
    });

    res.json({ matched: true, matchId: match.id, conversationId: conversation.id });
  } catch (err) {
    next(err);
  }
});

router.get('/received', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const myId = req.user.profile.id;

    // On exclut les profils déjà matchés : ils sont dans "Mes matchs" /
    // messages, pas besoin de les repousser ici en plus.
    const matches = await prisma.match.findMany({
      where: { OR: [{ profileAId: myId }, { profileBId: myId }] },
    });
    const matchedIds = new Set(matches.map((m) => (m.profileAId === myId ? m.profileBId : m.profileAId)));

    const likes = await prisma.like.findMany({
      where: { toProfileId: myId, fromProfileId: { notIn: [...matchedIds] } },
      include: { fromProfile: { include: { photos: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      profiles: likes.map((l) => ({
        id: l.fromProfile.id,
        pseudo: l.fromProfile.pseudo,
        city: l.fromProfile.city,
        photo: l.fromProfile.photos.find((p) => p.moderationStatus === 'APPROVED')?.url || null,
        online: isOnline(l.fromProfile.id),
        department: departmentForCity(l.fromProfile.city),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Profils ayant aimé au moins une de mes photos (distinct des likes de
// profil ci-dessus) — même exclusion des profils déjà matchés.
router.get('/photo-likers', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const myId = req.user.profile.id;

    const matches = await prisma.match.findMany({
      where: { OR: [{ profileAId: myId }, { profileBId: myId }] },
    });
    const matchedIds = new Set(matches.map((m) => (m.profileAId === myId ? m.profileBId : m.profileAId)));

    const photoLikes = await prisma.photoLike.findMany({
      where: { photo: { profileId: myId }, profileId: { notIn: [...matchedIds] } },
      distinct: ['profileId'],
      include: { profile: { include: { photos: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      profiles: photoLikes.map((l) => ({
        id: l.profile.id,
        pseudo: l.profile.pseudo,
        city: l.profile.city,
        photo: l.profile.photos.find((p) => p.moderationStatus === 'APPROVED')?.url || null,
        online: isOnline(l.profile.id),
        department: departmentForCity(l.profile.city),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
