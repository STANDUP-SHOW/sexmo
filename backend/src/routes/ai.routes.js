const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { generateConversationSuggestions } = require('../services/aiService');

const router = express.Router();

const schema = z.object({ conversationId: z.string() });

router.post('/conversation-suggestions', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const { conversationId } = schema.parse(req.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        match: { include: { profileA: true, profileB: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation introuvable' });

    const myId = req.user.profile.id;
    const { profileA, profileB } = conversation.match;
    if (myId !== profileA.id && myId !== profileB.id) {
      return res.status(404).json({ error: 'Conversation introuvable' });
    }

    const myProfile = profileA.id === myId ? profileA : profileB;
    const otherProfile = profileA.id === myId ? profileB : profileA;
    const recentMessages = conversation.messages.reverse();

    const suggestions = await generateConversationSuggestions({ myProfile, otherProfile, recentMessages });
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
