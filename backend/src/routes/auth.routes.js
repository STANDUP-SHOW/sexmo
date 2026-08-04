const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { signToken, signMediaToken } = require('../utils/jwt');
const { computeAge, MIN_AGE } = require('../utils/age');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const GENDERS = ['HOMME', 'FEMME', 'COUPLE_HOMME_FEMME', 'COUPLE_HOMME_HOMME', 'COUPLE_FEMME_FEMME', 'TRANS', 'NON_BINAIRE', 'AUTRE'];
const ORIENTATIONS = ['HETERO', 'HOMO', 'BI', 'CURIEUX', 'AUTRE'];

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
  birthDate: z.coerce.date(),
  pseudo: z.string().min(2).max(30),
  gender: z.enum(GENDERS),
  orientation: z.enum(ORIENTATIONS),
  seeking: z.array(z.enum(GENDERS)).min(1),
  city: z.string().min(1),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les CGU et confirmer être majeur·e" }) }),
});

router.post('/signup', async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);

    const age = computeAge(data.birthDate);
    if (age < MIN_AGE) {
      return res.status(403).json({ error: `Ce site est réservé aux personnes majeures (${MIN_AGE} ans et plus).` });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        birthDate: data.birthDate,
        termsAcceptedAt: now,
        ageConfirmedAt: now,
        profile: {
          create: {
            pseudo: data.pseudo,
            gender: data.gender,
            orientation: data.orientation,
            seeking: data.seeking,
            city: data.city,
          },
        },
      },
      include: { profile: true },
    });

    const token = signToken({ userId: user.id });
    const mediaToken = signMediaToken(user.id);
    const { passwordHash: _omit, ...safeUser } = user;
    res.status(201).json({ token, mediaToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    if (user.status === 'BANNED') return res.status(403).json({ error: 'Compte banni' });
    if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Compte suspendu' });

    const token = signToken({ userId: user.id });
    const mediaToken = signMediaToken(user.id);
    const { passwordHash: _omit, ...safeUser } = user;
    res.json({ token, mediaToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const { passwordHash: _omit, ...safeUser } = req.user;
  res.json({ user: safeUser, mediaToken: signMediaToken(req.user.id) });
});

module.exports = router;
