const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { approximateDistanceKm } = require('../utils/geo');

const router = express.Router();

async function loadConversationForProfile(conversationId, profileId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: {
        include: {
          profileA: { include: { photos: true } },
          profileB: { include: { photos: true } },
        },
      },
    },
  });
  if (!conversation) return null;
  const { profileAId, profileBId } = conversation.match;
  if (profileId !== profileAId && profileId !== profileBId) return null;
  return conversation;
}

router.get('/conversations', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const myId = req.user.profile.id;
    const matches = await prisma.match.findMany({
      where: { OR: [{ profileAId: myId }, { profileBId: myId }] },
      include: {
        profileA: { include: { photos: true } },
        profileB: { include: { photos: true } },
        conversation: {
          include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myCity = req.user.profile.city;

    const results = matches
      .filter((m) => m.conversation)
      .map((m) => {
        const other = m.profileAId === myId ? m.profileB : m.profileA;
        const lastMessage = m.conversation.messages[0] || null;
        return {
          conversationId: m.conversation.id,
          matchId: m.id,
          otherProfile: {
            id: other.id,
            pseudo: other.pseudo,
            city: other.city,
            photo: other.photos.find((p) => p.moderationStatus === 'APPROVED')?.url || null,
          },
          // Distance approximative ville à ville (arrondie à 5 km), visible
          // uniquement ici entre deux profils déjà matchés — jamais publique,
          // jamais issue d'une position en temps réel.
          distanceKm: approximateDistanceKm(myCity, other.city),
          lastMessage,
        };
      });

    res.json({ conversations: results });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const conversation = await loadConversationForProfile(req.params.id, req.user.profile.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation introuvable' });

    const myId = req.user.profile.id;
    const { profileA, profileB } = conversation.match;
    const other = profileA.id === myId ? profileB : profileA;

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      messages,
      otherProfile: {
        id: other.id,
        pseudo: other.pseudo,
        city: other.city,
        photo: other.photos.find((p) => p.moderationStatus === 'APPROVED')?.url || null,
      },
      distanceKm: approximateDistanceKm(req.user.profile.city, other.city),
    });
  } catch (err) {
    next(err);
  }
});

const sendSchema = z.object({ content: z.string().min(1).max(2000) });

router.post('/conversations/:id', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const conversation = await loadConversationForProfile(req.params.id, req.user.profile.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation introuvable' });

    const { content } = sendSchema.parse(req.body);

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderProfileId: req.user.profile.id,
        content,
      },
    });

    const io = req.app.get('io');
    io?.to(`conversation:${conversation.id}`).emit('message:new', message);

    const { profileA, profileB } = conversation.match;
    const otherProfileId = profileA.id === req.user.profile.id ? profileB.id : profileA.id;
    io?.to(`profile:${otherProfileId}`).emit('message:notification', {
      conversationId: conversation.id,
      preview: content.slice(0, 80),
    });

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
