const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const pages = await prisma.page.findMany({
      where: { published: true },
      select: { slug: true, title: true },
      orderBy: { title: 'asc' },
    });
    res.json({ pages });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
    if (!page || !page.published) return res.status(404).json({ error: 'Page introuvable' });

    const comments = await prisma.comment.findMany({
      where: { pageId: page.id, status: 'APPROVED' },
      include: { authorUser: { include: { profile: { select: { pseudo: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      page: { slug: page.slug, title: page.title, content: page.content },
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        authorPseudo: c.authorUser.profile?.pseudo || 'Utilisateur',
      })),
    });
  } catch (err) {
    next(err);
  }
});

const commentSchema = z.object({ content: z.string().min(1).max(1000) });

router.post('/:slug/comments', requireAuth, async (req, res, next) => {
  try {
    const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
    if (!page || !page.published) return res.status(404).json({ error: 'Page introuvable' });

    const { content } = commentSchema.parse(req.body);

    const comment = await prisma.comment.create({
      data: { pageId: page.id, authorUserId: req.user.id, content },
    });

    res.status(201).json({ comment, notice: 'Commentaire envoyé, il sera visible après validation par la modération.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
