// Lieux de rencontre : établissements commerciaux (saunas, love shops,
// hammams, bars, clubs vidéo, cinémas) ajoutés par les membres, publiés
// après validation par la modération — même logique que les photos.
const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/auth');
const DEPARTMENTS = require('../data/departments');

const router = express.Router();

const PLACE_TYPES = ['SAUNA', 'LOVE_SHOP', 'HAMMAM', 'BAR', 'CLUB_VIDEO', 'CINEMA'];
const DEPARTMENT_CODES = new Set(DEPARTMENTS.map((d) => d.code));

router.get('/meta', (req, res) => {
  res.json({ departments: DEPARTMENTS, types: PLACE_TYPES });
});

router.get('/', async (req, res, next) => {
  try {
    const { department, type } = req.query;
    const places = await prisma.meetingPlace.findMany({
      where: {
        moderationStatus: 'APPROVED',
        ...(department ? { department } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ places });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(PLACE_TYPES),
  department: z.string().refine((d) => DEPARTMENT_CODES.has(d), 'Département invalide'),
  city: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const place = await prisma.meetingPlace.create({
      data: { ...data, addedByUserId: req.user.id },
    });
    res.status(201).json({ place, notice: 'Lieu envoyé, il sera visible après validation par la modération.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
