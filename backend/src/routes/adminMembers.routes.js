// Gestion des membres depuis le back-office : liste/recherche, création,
// édition, suppression, "se connecter en tant que" (impersonation), gestion
// directe des photos/vidéos d'un membre, et import en masse (Excel/CSV/TXT).
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const XLSX = require('xlsx');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { signToken, signMediaToken } = require('../utils/jwt');
const { computeAge, MIN_AGE } = require('../utils/age');
const mediaStorage = require('../services/mediaStorage');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const GENDERS = ['HOMME', 'FEMME', 'COUPLE_HOMME_FEMME', 'COUPLE_HOMME_HOMME', 'COUPLE_FEMME_FEMME', 'TRANS', 'NON_BINAIRE', 'AUTRE'];
const ORIENTATIONS = ['HETERO', 'HOMO', 'BI', 'CURIEUX', 'AUTRE'];

// --- Liste / recherche ---

router.get('/', async (req, res, next) => {
  try {
    const { q, page = '1' } = req.query;
    const pageSize = 30;
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { profile: { pseudo: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { profile: { select: { id: true, pseudo: true, city: true, visible: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(1, Number(page)) - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      members: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        profile: u.profile,
      })),
      total,
      page: Number(page),
      pageSize,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { profile: { include: { photos: true, videos: true } } },
    });
    if (!user) return res.status(404).json({ error: 'Membre introuvable' });
    const { passwordHash: _omit, ...safeUser } = user;
    res.json({ member: safeUser });
  } catch (err) {
    next(err);
  }
});

// --- Création ---

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  birthDate: z.coerce.date(),
  pseudo: z.string().min(2).max(30),
  gender: z.enum(GENDERS),
  orientation: z.enum(ORIENTATIONS),
  seeking: z.array(z.enum(GENDERS)).min(1),
  city: z.string().min(1),
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    if (computeAge(data.birthDate) < MIN_AGE) {
      return res.status(400).json({ error: `Le membre doit avoir ${MIN_AGE} ans ou plus.` });
    }
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail' });

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
    const { passwordHash: _omit, ...safeUser } = user;
    res.status(201).json({ member: safeUser });
  } catch (err) {
    next(err);
  }
});

// --- Édition ---

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
  pseudo: z.string().min(2).max(30).optional(),
  city: z.string().min(1).optional(),
  bio: z.string().max(1000).optional(),
  visible: z.boolean().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = patchSchema.parse(req.body);
    const { status, ...profileData } = data;

    const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { profile: true } });
    if (!user) return res.status(404).json({ error: 'Membre introuvable' });

    if (status) await prisma.user.update({ where: { id: user.id }, data: { status } });
    if (Object.keys(profileData).length > 0 && user.profile) {
      await prisma.profile.update({ where: { userId: user.id }, data: profileData });
    }

    const updated = await prisma.user.findUnique({ where: { id: user.id }, include: { profile: true } });
    const { passwordHash: _omit, ...safeUser } = updated;
    res.json({ member: safeUser });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte admin depuis cet écran.' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Se connecter en tant que ce membre ---

router.post('/:id/impersonate', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { profile: true } });
    if (!user) return res.status(404).json({ error: 'Membre introuvable' });

    const token = signToken({ userId: user.id });
    const mediaToken = signMediaToken(user.id);
    const { passwordHash: _omit, ...safeUser } = user;
    res.json({ token, mediaToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// --- Photos/vidéos d'un membre, gérées directement par l'admin ---

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Format non supporté (jpeg, png ou webp uniquement)'));
    cb(null, true);
  },
});

router.post('/:id/photos', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const profile = await prisma.profile.findUnique({ where: { userId: req.params.id } });
    if (!profile) return res.status(404).json({ error: 'Ce membre n\'a pas encore de profil' });

    const isPrivate = req.body.isPrivate === 'true';
    const count = await prisma.photo.count({ where: { profileId: profile.id } });
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    await mediaStorage.uploadBuffer(req.file.buffer, filename);

    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        url: `/media/photos/${filename}`,
        isPrivate,
        position: count,
        // Ajoutée directement par un administrateur : approuvée d'emblée.
        moderationStatus: 'APPROVED',
      },
    });
    res.status(201).json({ photo });
  } catch (err) {
    next(err);
  }
});

// --- Import en masse (Excel .xlsx, CSV, ou TXT délimité par virgule/tabulation) ---
//
// Colonnes attendues (première ligne = en-têtes, dans n'importe quel ordre) :
//   email        (obligatoire, unique)
//   password     (obligatoire, 8 caractères min.)
//   pseudo       (obligatoire, 2-30 caractères)
//   birthDate    (obligatoire, AAAA-MM-JJ, le membre doit avoir 18 ans ou plus)
//   gender       (obligatoire, une valeur parmi : HOMME, FEMME, COUPLE_HOMME_FEMME,
//                 COUPLE_HOMME_HOMME, COUPLE_FEMME_FEMME, TRANS, NON_BINAIRE, AUTRE)
//   orientation  (obligatoire, une valeur parmi : HETERO, HOMO, BI, CURIEUX, AUTRE)
//   seeking      (obligatoire, une ou plusieurs valeurs de la liste "gender"
//                 séparées par un point-virgule, ex. "HOMME;COUPLE_HOMME_FEMME")
//   city         (obligatoire)
//   bio          (optionnel)
const REQUIRED_IMPORT_COLUMNS = ['email', 'password', 'pseudo', 'birthDate', 'gender', 'orientation', 'seeking', 'city'];

router.get('/import/template', (req, res) => {
  const header = [...REQUIRED_IMPORT_COLUMNS, 'bio'];
  const example = ['jeanne.d@example.com', 'MotDePasse8', 'JeanneD', '1990-05-14', 'FEMME', 'BI', 'HOMME;COUPLE_HOMME_FEMME', 'Lyon', 'Curieuse et ouverte d\'esprit.'];
  const csv = [header.join(','), example.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="modele-import-membres.csv"');
  res.send('﻿' + csv); // BOM pour un bon rendu des accents dans Excel
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = ['.xlsx', '.xls', '.csv', '.txt'];
    if (!allowedExt.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Format non supporté (xlsx, xls, csv ou txt uniquement)'));
    }
    cb(null, true);
  },
});

const importRowSchema = z.object({
  email: z.string().trim().email('e-mail invalide'),
  password: z.string().min(8, 'mot de passe : 8 caractères minimum'),
  pseudo: z.string().trim().min(2).max(30),
  birthDate: z.coerce.date({ errorMap: () => ({ message: 'date de naissance invalide (attendu AAAA-MM-JJ)' }) }),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: `gender invalide (attendu : ${GENDERS.join(', ')})` }) }),
  orientation: z.enum(ORIENTATIONS, { errorMap: () => ({ message: `orientation invalide (attendu : ${ORIENTATIONS.join(', ')})` }) }),
  city: z.string().trim().min(1),
  bio: z.string().trim().max(1000).optional(),
});

router.post('/import', importUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Le fichier ne contient aucune ligne de données (vérifiez la ligne d\'en-têtes).' });
    }

    const results = { created: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +1 pour l'en-tête, +1 pour l'index 0-based
      const raw = rows[i];
      try {
        const seekingRaw = String(raw.seeking || '').trim();
        const seeking = seekingRaw.split(';').map((s) => s.trim()).filter(Boolean);
        if (seeking.length === 0) throw new Error('seeking manquant');
        for (const g of seeking) {
          if (!GENDERS.includes(g)) throw new Error(`seeking invalide : "${g}" (attendu : ${GENDERS.join(', ')})`);
        }

        const data = importRowSchema.parse({ ...raw, seeking });

        if (computeAge(data.birthDate) < MIN_AGE) {
          throw new Error(`le membre doit avoir ${MIN_AGE} ans ou plus`);
        }

        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) throw new Error('un compte existe déjà avec cet e-mail');

        const passwordHash = await bcrypt.hash(data.password, 10);
        const now = new Date();
        await prisma.user.create({
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
                seeking,
                city: data.city,
                bio: data.bio || '',
              },
            },
          },
        });
        results.created++;
      } catch (rowErr) {
        const message = rowErr.issues?.map((i) => i.message).join('; ') || rowErr.message;
        results.errors.push({ row: rowNumber, email: raw.email || '(vide)', reason: message });
      }
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
