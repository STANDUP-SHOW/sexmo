// Sexmo Tchat : salons publics par département. Lecture ouverte à tous
// (membres et invités), l'envoi passe par le websocket (voir sockets/chat.js)
// qui applique la vérification de bannissement.
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const DEPARTMENTS = require('../data/departments');
const mediaStorage = require('../services/mediaStorage');

const router = express.Router();

const DEPARTMENT_CODES = new Set(DEPARTMENTS.map((d) => d.code));

router.get('/departments', (req, res) => {
  res.json({ departments: DEPARTMENTS });
});

// Envoi de photo dans une discussion privée uniquement (jamais dans un salon
// public — voir tchat/page.jsx). Accessible aux invités comme aux membres :
// le tchat leur est déjà ouvert sans compte, pas de raison de leur refuser
// l'envoi de photo en privé alors qu'il est autorisé en texte.
const chatPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Format non supporté (jpeg, png ou webp uniquement)'));
    cb(null, true);
  },
});

router.post('/photo', chatPhotoUpload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    await mediaStorage.uploadBuffer(req.file.buffer, filename);
    const url = `/media/chat-photos/${filename}`;
    await prisma.chatPhoto.create({ data: { url } });
    res.status(201).json({ url });
  } catch (err) {
    next(err);
  }
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
