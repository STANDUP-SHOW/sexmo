const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { computeAge } = require('../utils/age');
const { computeReputation } = require('../utils/reputation');
const { computeProfileQuality } = require('../utils/profileQuality');
const { ALL_PRACTICE_KEYS } = require('../constants/practices');
const { nearestCity } = require('../utils/geo');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
  practices: z.array(z.enum(ALL_PRACTICE_KEYS)).optional(),
  bodyType: z.enum(['ATHLETIQUE', 'SVELTE', 'MOYENNE', 'ENROBEE', 'RONDE']).nullable().optional(),
  eyeColor: z.enum(['MARRON', 'BLEU', 'VERT', 'GRIS', 'NOISETTE']).nullable().optional(),
  adCategory: z.enum(['EPHEMERE', 'ECHANGISME', 'PLURALISME', 'VOYEURISME', 'GROUPE']).nullable().optional(),
  experienceLevel: z.enum(['DEBUTANT', 'AMATEUR', 'EXPERIMENTE', 'EXPERT']).nullable().optional(),
  visible: z.boolean().optional(),
  available: z.boolean().optional(),
  privatePhotosAccess: z.enum(['EVERYONE', 'ON_REQUEST']).optional(),
  useGeolocation: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().int().min(0).max(300).optional(),
});

router.patch('/me', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);

    // Géolocalisation activée avec une position fraîche : la ville et la
    // région sont recalculées automatiquement vers la ville connue la plus
    // proche, sans que le membre ait à la ressaisir.
    if (data.useGeolocation && data.latitude != null && data.longitude != null) {
      const nearest = nearestCity(data.latitude, data.longitude);
      if (nearest) {
        data.city = nearest.name;
        data.region = nearest.region;
      }
    }

    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data,
    });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

function toPublicProfile(profile, ownerBirthDate, options = {}) {
  const { hasPrivateAccess = false } = options;
  const approved = (profile.photos || [])
    .filter((p) => p.moderationStatus === 'APPROVED')
    .sort((a, b) => a.position - b.position);
  const publicPhotos = approved.filter((p) => !p.isPrivate);
  const privatePhotos = approved.filter((p) => p.isPrivate);

  const result = {
    id: profile.id,
    pseudo: profile.pseudo,
    gender: profile.gender,
    orientation: profile.orientation,
    seeking: profile.seeking,
    city: profile.city,
    region: profile.region,
    bio: profile.bio,
    interests: profile.interests,
    practices: profile.practices,
    bodyType: profile.bodyType,
    eyeColor: profile.eyeColor,
    adCategory: profile.adCategory,
    experienceLevel: profile.experienceLevel,
    available: profile.available,
    useGeolocation: profile.useGeolocation,
    radiusKm: profile.radiusKm,
    age: ownerBirthDate ? computeAge(ownerBirthDate) : null,
    lastActiveAt: profile.lastActiveAt,
    memberSinceDays: Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / MS_PER_DAY),
    photos: publicPhotos.map((p) => ({ id: p.id, url: p.url, isPrivate: false })),
    privatePhotoCount: privatePhotos.length,
    hasPrivateAccess,
    privatePhotosAccess: profile.privatePhotosAccess,
  };

  if (hasPrivateAccess) {
    result.privatePhotos = privatePhotos.map((p) => ({ id: p.id, url: p.url, isPrivate: true }));
  }

  if (profile.videos) {
    result.videos = profile.videos
      .filter((v) => v.moderationStatus === 'APPROVED')
      .sort((a, b) => a.position - b.position)
      .map((v) => ({ id: v.id, url: v.url }));
  }

  return result;
}

router.get('/me/quality', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const approvedPhotoCount = await prisma.photo.count({
      where: { profileId: req.user.profile.id, moderationStatus: 'APPROVED' },
    });
    res.json(computeProfileQuality(req.user.profile, approvedPhotoCount));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireProfile, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { photos: true, videos: true, user: true },
    });
    if (!profile || !profile.visible) return res.status(404).json({ error: 'Profil introuvable' });

    const viewerId = req.user.profile.id;

    const blocked = await prisma.blockedProfile.findFirst({
      where: {
        OR: [
          { blockerProfileId: viewerId, blockedProfileId: profile.id },
          { blockerProfileId: profile.id, blockedProfileId: viewerId },
        ],
      },
    });
    if (blocked) return res.status(404).json({ error: 'Profil introuvable' });

    let hasPrivateAccess = viewerId === profile.id || profile.privatePhotosAccess === 'EVERYONE';
    if (!hasPrivateAccess) {
      const grant = await prisma.photoAccessGrant.findUnique({
        where: { ownerProfileId_requesterProfileId: { ownerProfileId: profile.id, requesterProfileId: viewerId } },
      });
      hasPrivateAccess = grant?.status === 'APPROVED';
    }

    const reputation = await computeReputation(profile);

    res.json({ profile: { ...toPublicProfile(profile, profile.user.birthDate, { hasPrivateAccess }), reputation } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.toPublicProfile = toPublicProfile;
