// Sexmo Tchat : salons publics par département. Lecture ouverte à tous
// (membres et invités), l'envoi passe par le websocket (voir sockets/chat.js)
// qui applique la vérification de bannissement.
const express = require('express');
const prisma = require('../config/prisma');
const DEPARTMENTS = require('../data/departments');

const router = express.Router();

const DEPARTMENT_CODES = new Set(DEPARTMENTS.map((d) => d.code));

router.get('/departments', (req, res) => {
  res.json({ departments: DEPARTMENTS });
});

router.get('/:department/history', async (req, res, next) => {
  try {
    const { department } = req.params;
    if (!DEPARTMENT_CODES.has(department)) return res.status(404).json({ error: 'Département inconnu' });

    const messages = await prisma.chatMessage.findMany({
      where: { department },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
