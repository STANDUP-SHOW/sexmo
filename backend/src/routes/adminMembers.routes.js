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
const { ALL_PRACTICE_KEYS } = require('../constants/practices');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const GENDERS = ['HOMME', 'FEMME', 'COUPLE_HOMME_FEMME', 'COUPLE_HOMME_HOMME', 'COUPLE_FEMME_FEMME', 'TRANS', 'NON_BINAIRE', 'AUTRE'];
const ORIENTATIONS = ['HETERO', 'HOMO', 'BI', 'CURIEUX', 'PANSEXUEL', 'AUTRE'];
const SEX_ROLES = ['ACTIF', 'PASSIF', 'VERSA'];
const BODY_TYPES = ['ATHLETIQUE', 'SVELTE', 'MOYENNE', 'ENROBEE', 'RONDE'];
const EYE_COLORS = ['MARRON', 'BLEU', 'VERT', 'GRIS', 'NOISETTE'];
const AD_CATEGORIES = ['EPHEMERE', 'ECHANGISME', 'PLURALISME', 'VOYEURISME', 'GROUPE'];
const EXPERIENCE_LEVELS = ['DEBUTANT', 'AMATEUR', 'EXPERIMENTE', 'EXPERT'];

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
  gender: z.enum(GENDERS).optional(),
  orientation: z.enum(ORIENTATIONS).optional(),
  sexRole: z.enum(SEX_ROLES).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  weightKg: z.number().int().min(30).max(250).nullable().optional(),
  seeking: z.array(z.enum(GENDERS)).min(1).optional(),
  city: z.string().min(1).optional(),
  region: z.string().optional(),
  bio: z.string().max(1000).optional(),
  interests: z.array(z.string()).optional(),
  practices: z.array(z.enum(ALL_PRACTICE_KEYS)).optional(),
  bodyType: z.enum(['ATHLETIQUE', 'SVELTE', 'MOYENNE', 'ENROBEE', 'RONDE']).nullable().optional(),
  eyeColor: z.enum(['MARRON', 'BLEU', 'VERT', 'GRIS', 'NOISETTE']).nullable().optional(),
  adCategory: z.enum(['EPHEMERE', 'ECHANGISME', 'PLURALISME', 'VOYEURISME', 'GROUPE']).nullable().optional(),
  experienceLevel: z.enum(['DEBUTANT', 'AMATEUR', 'EXPERIMENTE', 'EXPERT']).nullable().optional(),
  visible: z.boolean().optional(),
  available: z.boolean().optional(),
  privatePhotosAccess: z.enum(['EVERYONE', 'ON_REQUEST']).optional(),
  useGeolocation: z.boolean().optional(),
  radiusKm: z.number().int().min(0).max(300).optional(),
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

const MAX_PUBLIC_PHOTOS = 5;
const MAX_PRIVATE_PHOTOS = 20;

router.post('/:id/photos', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const profile = await prisma.profile.findUnique({ where: { userId: req.params.id } });
    if (!profile) return res.status(404).json({ error: 'Ce membre n\'a pas encore de profil' });

    const isPrivate = req.body.isPrivate === 'true';
    const max = isPrivate ? MAX_PRIVATE_PHOTOS : MAX_PUBLIC_PHOTOS;
    const count = await prisma.photo.count({ where: { profileId: profile.id, isPrivate } });
    if (count >= max) {
      return res.status(400).json({
        error: isPrivate ? `Maximum ${MAX_PRIVATE_PHOTOS} photos privées par profil` : `Maximum ${MAX_PUBLIC_PHOTOS} photos publiques par profil`,
      });
    }

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

// Import multiple / dossier entier : ne prend que ce qui reste de quota
// (5 publiques / 20 privées), le reste est ignoré et signalé.
router.post('/:id/photos/batch', upload.array('photos', 25), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const profile = await prisma.profile.findUnique({ where: { userId: req.params.id } });
    if (!profile) return res.status(404).json({ error: 'Ce membre n\'a pas encore de profil' });

    const isPrivate = req.body.isPrivate === 'true';
    const max = isPrivate ? MAX_PRIVATE_PHOTOS : MAX_PUBLIC_PHOTOS;
    let count = await prisma.photo.count({ where: { profileId: profile.id, isPrivate } });

    const created = [];
    let skipped = 0;

    for (const file of req.files) {
      if (count >= max) { skipped++; continue; }

      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = `${crypto.randomUUID()}${ext}`;
      await mediaStorage.uploadBuffer(file.buffer, filename);

      const photo = await prisma.photo.create({
        data: {
          profileId: profile.id,
          url: `/media/photos/${filename}`,
          isPrivate,
          position: count,
          moderationStatus: 'APPROVED',
        },
      });
      created.push(photo);
      count++;
    }

    res.status(201).json({
      photos: created,
      skipped,
      notice: skipped > 0
        ? `${created.length} photo(s) ajoutée(s), ${skipped} ignorée(s) (limite de ${max} photos ${isPrivate ? 'privées' : 'publiques'} atteinte).`
        : `${created.length} photo(s) ajoutée(s).`,
    });
  } catch (err) {
    next(err);
  }
});

// --- Vidéos d'un membre, gérées directement par l'admin ---

const MAX_VIDEOS_PER_PROFILE = 3;

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Format non supporté (mp4, mov ou webm uniquement)'));
    cb(null, true);
  },
});

router.post('/:id/videos', videoUpload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const profile = await prisma.profile.findUnique({ where: { userId: req.params.id } });
    if (!profile) return res.status(404).json({ error: 'Ce membre n\'a pas encore de profil' });

    const count = await prisma.video.count({ where: { profileId: profile.id } });
    if (count >= MAX_VIDEOS_PER_PROFILE) {
      return res.status(400).json({ error: `Maximum ${MAX_VIDEOS_PER_PROFILE} vidéos par profil` });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp4';
    const filename = `${crypto.randomUUID()}${ext}`;
    await mediaStorage.uploadBuffer(req.file.buffer, filename);

    const video = await prisma.video.create({
      data: {
        profileId: profile.id,
        url: `/media/videos/${filename}`,
        position: count,
        // Ajoutée directement par un administrateur : approuvée d'emblée.
        moderationStatus: 'APPROVED',
      },
    });
    res.status(201).json({ video });
  } catch (err) {
    next(err);
  }
});

// Import multiple / dossier entier : ne prend que ce qui reste de quota
// (3 vidéos par profil), le reste est ignoré et signalé.
router.post('/:id/videos/batch', videoUpload.array('videos', MAX_VIDEOS_PER_PROFILE), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const profile = await prisma.profile.findUnique({ where: { userId: req.params.id } });
    if (!profile) return res.status(404).json({ error: 'Ce membre n\'a pas encore de profil' });

    let count = await prisma.video.count({ where: { profileId: profile.id } });
    const created = [];
    let skipped = 0;

    for (const file of req.files) {
      if (count >= MAX_VIDEOS_PER_PROFILE) { skipped++; continue; }

      const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
      const filename = `${crypto.randomUUID()}${ext}`;
      await mediaStorage.uploadBuffer(file.buffer, filename);

      const video = await prisma.video.create({
        data: {
          profileId: profile.id,
          url: `/media/videos/${filename}`,
          position: count,
          moderationStatus: 'APPROVED',
        },
      });
      created.push(video);
      count++;
    }

    res.status(201).json({
      videos: created,
      skipped,
      notice: skipped > 0
        ? `${created.length} vidéo(s) ajoutée(s), ${skipped} ignorée(s) (limite de ${MAX_VIDEOS_PER_PROFILE} vidéos atteinte).`
        : `${created.length} vidéo(s) ajoutée(s).`,
    });
  } catch (err) {
    next(err);
  }
});

// --- Import en masse (Excel .xlsx, CSV, ou TXT délimité par virgule/tabulation) ---
//
// Colonnes attendues (première ligne = en-têtes, dans n'importe quel ordre) :
//   email           (obligatoire, unique)
//   password        (obligatoire, 8 caractères min.)
//   pseudo          (obligatoire, 2-30 caractères)
//   birthDate       (obligatoire, AAAA-MM-JJ, le membre doit avoir 18 ans ou plus)
//   gender          (obligatoire, une valeur parmi : HOMME, FEMME, COUPLE_HOMME_FEMME,
//                    COUPLE_HOMME_HOMME, COUPLE_FEMME_FEMME, TRANS, NON_BINAIRE, AUTRE)
//   orientation     (obligatoire, une valeur parmi : HETERO, HOMO, BI, CURIEUX, PANSEXUEL, AUTRE)
//   seeking         (obligatoire, une ou plusieurs valeurs de la liste "gender"
//                    séparées par un point-virgule, ex. "HOMME;COUPLE_HOMME_FEMME")
//   city            (obligatoire)
//   bio             (optionnel)
//   sexRole         (optionnel : ACTIF, PASSIF ou VERSA)
//   available       (optionnel : true/false — "disponible pour discuter maintenant")
//   bodyType        (optionnel : ATHLETIQUE, SVELTE, MOYENNE, ENROBEE, RONDE)
//   eyeColor        (optionnel : MARRON, BLEU, VERT, GRIS, NOISETTE)
//   adCategory      (optionnel : EPHEMERE, ECHANGISME, PLURALISME, VOYEURISME, GROUPE)
//   experienceLevel (optionnel : DEBUTANT, AMATEUR, EXPERIMENTE, EXPERT)
//   heightCm        (optionnel : nombre entier, 100-250)
//   weightKg        (optionnel : nombre entier, 30-250)
//   interests       (optionnel : centres d'intérêt libres séparés par des virgules)
//   practices       (optionnel : une ou plusieurs pratiques séparées par un point-virgule,
//                    voir src/constants/practices.js pour la liste des clés valides,
//                    ex. "ECHANGE_SOFT;TRIOLISME;LINGERIE")
//   photoPrefix     (optionnel — voir import groupé des photos ci-dessous)
//
// Import groupé des photos : en plus du fichier de données, l'admin peut
// joindre un lot de fichiers photo (jusqu'à 5 par membre, le reste est
// ignoré). Chaque photo doit être nommée "<prefix>-photoN.ext" (N = 1 à 5),
// où <prefix> est la colonne "photoPrefix" de la ligne si présente, sinon
// le "pseudo". La comparaison ignore la casse, les accents et tout
// caractère qui n'est pas une lettre/chiffre (ex. "Jeanne D." et
// "jeanne_d-photo1.jpg" correspondent).
const REQUIRED_IMPORT_COLUMNS = ['email', 'password', 'pseudo', 'birthDate', 'gender', 'orientation', 'seeking', 'city'];
const OPTIONAL_IMPORT_COLUMNS = [
  'bio', 'sexRole', 'available', 'bodyType', 'eyeColor', 'adCategory', 'experienceLevel',
  'heightCm', 'weightKg', 'interests', 'practices', 'photoPrefix',
];

router.get('/import/template', (req, res) => {
  const header = [...REQUIRED_IMPORT_COLUMNS, ...OPTIONAL_IMPORT_COLUMNS];
  const example = [
    'jeanne.d@example.com', 'MotDePasse8', 'JeanneD', '1990-05-14', 'FEMME', 'BI', 'HOMME;COUPLE_HOMME_FEMME', 'Lyon',
    'Curieuse et ouverte d\'esprit.', 'VERSA', 'true', 'SVELTE', 'VERT', 'ECHANGISME', 'AMATEUR', '168', '60',
    'cinéma, voyages', 'ECHANGE_SOFT;TRIOLISME;LINGERIE', 'jeanne_d',
  ];
  const csv = [header.join(','), example.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="modele-import-membres.csv"');
  res.send('﻿' + csv); // BOM pour un bon rendu des accents dans Excel
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') {
      const allowedExt = ['.xlsx', '.xls', '.csv', '.txt'];
      if (!allowedExt.includes(path.extname(file.originalname).toLowerCase())) {
        return cb(new Error('Fichier de données : format non supporté (xlsx, xls, csv ou txt uniquement)'));
      }
      return cb(null, true);
    }
    if (file.fieldname === 'photos') {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.mimetype)) return cb(new Error('Photos : format non supporté (jpeg, png ou webp uniquement)'));
      return cb(null, true);
    }
    cb(new Error('Champ de fichier inattendu'));
  },
});

// Colonne optionnelle vide -> undefined (le schéma ne doit pas la refuser),
// sinon on valide contre l'enum indiqué.
function optionalEnumColumn(values) {
  return z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.enum(values, { errorMap: () => ({ message: `valeur invalide (attendu : ${values.join(', ')})` }) }).optional()
  );
}

function optionalIntColumn(min, max) {
  return z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().int().min(min).max(max).optional()
  );
}

function optionalBoolColumn() {
  return z.preprocess(
    (v) => (v === '' || v == null ? undefined : ['true', '1', 'oui', 'vrai'].includes(String(v).trim().toLowerCase())),
    z.boolean().optional()
  );
}

const importRowSchema = z.object({
  email: z.string().trim().email('e-mail invalide'),
  password: z.string().min(8, 'mot de passe : 8 caractères minimum'),
  pseudo: z.string().trim().min(2).max(30),
  birthDate: z.coerce.date({ errorMap: () => ({ message: 'date de naissance invalide (attendu AAAA-MM-JJ)' }) }),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: `gender invalide (attendu : ${GENDERS.join(', ')})` }) }),
  orientation: z.enum(ORIENTATIONS, { errorMap: () => ({ message: `orientation invalide (attendu : ${ORIENTATIONS.join(', ')})` }) }),
  city: z.string().trim().min(1),
  bio: z.string().trim().max(1000).optional(),
  sexRole: optionalEnumColumn(SEX_ROLES),
  available: optionalBoolColumn(),
  bodyType: optionalEnumColumn(BODY_TYPES),
  eyeColor: optionalEnumColumn(EYE_COLORS),
  adCategory: optionalEnumColumn(AD_CATEGORIES),
  experienceLevel: optionalEnumColumn(EXPERIENCE_LEVELS),
  heightCm: optionalIntColumn(100, 250),
  weightKg: optionalIntColumn(30, 250),
  interests: z.string().trim().optional(),
  practices: z.string().trim().optional(),
  photoPrefix: z.string().trim().optional(),
});

// Normalise un nom pour la correspondance photo <-> membre : minuscules,
// accents retirés, tout ce qui n'est pas alphanumérique supprimé.
function normalizeForMatch(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const PHOTO_FILENAME_RE = /^(.*)-photo(\d+)\.[a-zA-Z0-9]+$/;

router.post('/import', importUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'photos', maxCount: 2000 }]), async (req, res, next) => {
  try {
    const dataFile = req.files?.file?.[0];
    if (!dataFile) return res.status(400).json({ error: 'Aucun fichier de données reçu' });
    const photoFiles = req.files?.photos || [];

    const parsedPhotos = photoFiles
      .map((f) => {
        const m = f.originalname.match(PHOTO_FILENAME_RE);
        if (!m) return null;
        return { file: f, prefix: normalizeForMatch(m[1]), num: parseInt(m[2], 10) };
      })
      .filter(Boolean);

    const workbook = XLSX.read(dataFile.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Le fichier ne contient aucune ligne de données (vérifiez la ligne d\'en-têtes).' });
    }

    const results = { created: 0, photosImported: 0, errors: [] };

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

        const practicesRaw = String(raw.practices || '').trim();
        const practices = practicesRaw ? practicesRaw.split(';').map((s) => s.trim()).filter(Boolean) : [];
        for (const p of practices) {
          if (!ALL_PRACTICE_KEYS.includes(p)) throw new Error(`pratique invalide : "${p}"`);
        }

        const data = importRowSchema.parse({ ...raw, seeking });
        const interests = data.interests ? data.interests.split(',').map((s) => s.trim()).filter(Boolean) : [];

        if (computeAge(data.birthDate) < MIN_AGE) {
          throw new Error(`le membre doit avoir ${MIN_AGE} ans ou plus`);
        }

        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) throw new Error('un compte existe déjà avec cet e-mail');

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
                seeking,
                city: data.city,
                bio: data.bio || '',
                sexRole: data.sexRole || null,
                available: data.available ?? false,
                bodyType: data.bodyType || null,
                eyeColor: data.eyeColor || null,
                adCategory: data.adCategory || null,
                experienceLevel: data.experienceLevel || null,
                heightCm: data.heightCm ?? null,
                weightKg: data.weightKg ?? null,
                interests,
                practices,
              },
            },
          },
          include: { profile: true },
        });
        results.created++;

        const prefix = normalizeForMatch(data.photoPrefix || data.pseudo);
        const matches = parsedPhotos
          .filter((p) => p.prefix === prefix)
          .sort((a, b) => a.num - b.num)
          .slice(0, MAX_PUBLIC_PHOTOS);

        let position = 0;
        for (const m of matches) {
          const ext = path.extname(m.file.originalname).toLowerCase() || '.jpg';
          const filename = `${crypto.randomUUID()}${ext}`;
          await mediaStorage.uploadBuffer(m.file.buffer, filename);
          await prisma.photo.create({
            data: {
              profileId: user.profile.id,
              url: `/media/photos/${filename}`,
              isPrivate: false,
              position: position++,
              moderationStatus: 'APPROVED',
            },
          });
          results.photosImported++;
        }
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
