const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { requireAuth, requireProfile } = require('../middleware/auth');
const { computeAge } = require('../utils/age');
const { computeReputation } = require('../utils/reputation');
const { computeProfileQuality } = require('../utils/profileQuality');
const { ALL_PRACTICE_KEYS } = require('../constants/practices');
const { nearestCity, departmentForCity } = require('../utils/geo');
const { isOnline } = require('../state/onlinePresence');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const router = express.Router();

// Nombre de "j'aime" reçus par profil, affiché sur les fiches publiques.
// Une seule requête groupée plutôt qu'un COUNT par profil affiché.
async function likeCountsFor(profileIds) {
  if (profileIds.length === 0) return new Map();
  const rows = await prisma.like.groupBy({
    by: ['toProfileId'],
    where: { toProfileId: { in: profileIds } },
    _count: true,
  });
  return new Map(rows.map((r) => [r.toProfileId, r._count]));
}

const updateSchema = z.object({
  pseudo: z.string().min(2).max(30).optional(),
  gender: z.enum(['HOMME', 'FEMME', 'COUPLE_HOMME_FEMME', 'COUPLE_HOMME_HOMME', 'COUPLE_FEMME_FEMME', 'TRANS', 'NON_BINAIRE', 'AUTRE']).optional(),
  orientation: z.enum(['HETERO', 'HOMO', 'BI', 'CURIEUX', 'PANSEXUEL', 'AUTRE']).optional(),
  sexRole: z.enum(['ACTIF', 'PASSIF', 'VERSA']).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  weightKg: z.number().int().min(30).max(250).nullable().optional(),
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
  const { hasPrivateAccess = false, viewerId = null } = options;
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
    department: departmentForCity(profile.city),
    bio: profile.bio,
    interests: profile.interests,
    practices: profile.practices,
    bodyType: profile.bodyType,
    eyeColor: profile.eyeColor,
    sexRole: profile.sexRole,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    adCategory: profile.adCategory,
    experienceLevel: profile.experienceLevel,
    available: profile.available,
    online: isOnline(profile.id),
    useGeolocation: profile.useGeolocation,
    radiusKm: profile.radiusKm,
    age: ownerBirthDate ? computeAge(ownerBirthDate) : null,
    lastActiveAt: profile.lastActiveAt,
    memberSinceDays: Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / MS_PER_DAY),
    photos: publicPhotos.map((p) => ({
      id: p.id,
      url: p.url,
      isPrivate: false,
      likeCount: p.likes ? p.likes.length : 0,
      likedByMe: viewerId ? (p.likes || []).some((l) => l.profileId === viewerId) : false,
    })),
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
      include: { photos: { include: { likes: { select: { profileId: true } } } }, videos: true, user: true },
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

    // Avis publiés par ce membre sur le site (voir /api/testimonials) —
    // affichés comme signal de confiance sur sa fiche. Volontairement PAS un
    // système d'avis laissés par d'autres membres SUR ce profil : ouvrir la
    // notation entre membres sur une plateforme libertine créerait un risque
    // réel de diffamation/harcèlement ciblé, déjà écarté pour ce projet.
    const testimonials = await prisma.testimonial.findMany({
      where: { authorUserId: profile.user.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, rating: true, content: true, createdAt: true },
    });

    const likeCounts = await likeCountsFor([profile.id]);

    res.json({
      profile: {
        ...toPublicProfile(profile, profile.user.birthDate, { hasPrivateAccess, viewerId }),
        reputation,
        testimonials,
        likeCount: likeCounts.get(profile.id) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.toPublicProfile = toPublicProfile;
module.exports.likeCountsFor = likeCountsFor;
