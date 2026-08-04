const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { status: 'APPROVED' },
      include: { authorUser: { include: { profile: { select: { pseudo: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      testimonials: testimonials.map((t) => ({
        id: t.id,
        rating: t.rating,
        content: t.content,
        createdAt: t.createdAt,
        authorPseudo: t.authorUser.profile?.pseudo || 'Utilisateur',
      })),
    });
  } catch (err) {
    next(err);
  }
});

const testimonialSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1).max(1000),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = testimonialSchema.parse(req.body);
    const testimonial = await prisma.testimonial.create({
      data: { authorUserId: req.user.id, rating: data.rating, content: data.content },
    });
    res.status(201).json({ testimonial, notice: 'Avis envoyé, il sera visible après validation par la modération.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
