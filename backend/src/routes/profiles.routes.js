const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { computeAge } = require('../utils/age');

const router = express.Router();

const updateSchema = z.object({
  pseudo: z.string().min(2).max(30).optional(),
  gender: z.enum(['HOMME', 'FEMME', 'COUPLE_HOMME_FEMME', 'COUPLE_HOMME_HOMME', 'COUPLE_FEMME_FEMME', 'TRANS', 'NON_BINAIRE', 'AUTRE']).optional(),
  orientation: z.enum(['HETERO', 'HOMO', 'BI', 'CURIEUX', 'AUTRE']).optional(),
  seeking: z.array(z.string()).min(1).optional(),
  city: z.string().min(1).optional(),
  region: z.string().optional(),
  bio: z.string().max(1000).optional(),
  interests: z.array(z.string()).optional(),
  visible: z.boolean().optional(),
});

router.patch('/me', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data,
    });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

function toPublicProfile(profile, ownerBirthDate) {
  return {
    id: profile.id,
    pseudo: profile.pseudo,
    gender: profile.gender,
    orientation: profile.orientation,
    seeking: profile.seeking,
    city: profile.city,
    region: profile.region,
    bio: profile.bio,
    interests: profile.interests,
    age: ownerBirthDate ? computeAge(ownerBirthDate) : null,
    lastActiveAt: profile.lastActiveAt,
    photos: (profile.photos || [])
      .filter((p) => p.moderationStatus === 'APPROVED')
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, url: p.url, isPrivate: p.isPrivate })),
  };
}

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { photos: true, user: true },
    });
    if (!profile || !profile.visible) return res.status(404).json({ error: 'Profil introuvable' });

    const blocked = await prisma.blockedProfile.findFirst({
      where: {
        OR: [
          { blockerProfileId: req.user.profile.id, blockedProfileId: profile.id },
          { blockerProfileId: profile.id, blockedProfileId: req.user.profile.id },
        ],
      },
    });
    if (blocked) return res.status(404).json({ error: 'Profil introuvable' });

    res.json({ profile: toPublicProfile(profile, profile.user.birthDate) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.toPublicProfile = toPublicProfile;
