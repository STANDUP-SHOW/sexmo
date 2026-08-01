const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');

const router = express.Router();

async function loadConversationForProfile(conversationId, profileId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { match: true },
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

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages });
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

    const match = await prisma.match.findUnique({ where: { id: conversation.matchId } });
    const otherProfileId = match.profileAId === req.user.profile.id ? match.profileBId : match.profileAId;
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
