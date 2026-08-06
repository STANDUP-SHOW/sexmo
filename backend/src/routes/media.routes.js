const express = require('express');
const prisma = require('../config/prisma');
const { optionalAuth } = require('../middleware/auth');
const mediaStorage = require('../services/mediaStorage');

const router = express.Router();

async function isBlocked(profileIdA, profileIdB) {
  if (!profileIdA || !profileIdB) return false;
  const row = await prisma.blockedProfile.findFirst({
    where: {
      OR: [
        { blockerProfileId: profileIdA, blockedProfileId: profileIdB },
        { blockerProfileId: profileIdB, blockedProfileId: profileIdA },
      ],
    },
  });
  return Boolean(row);
}

async function canViewPrivatePhotos(ownerProfile, viewerProfileId) {
  if (ownerProfile.id === viewerProfileId) return true;
  if (ownerProfile.privatePhotosAccess === 'EVERYONE') return true;
  const grant = await prisma.photoAccessGrant.findUnique({
    where: { ownerProfileId_requesterProfileId: { ownerProfileId: ownerProfile.id, requesterProfileId: viewerProfileId } },
  });
  return grant?.status === 'APPROVED';
}

function streamFile(res, filename, contentType) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'private, max-age=300');
  const stream = mediaStorage.downloadStream(filename);
  stream.on('error', () => {
    if (!res.headersSent) res.status(502).json({ error: 'Fichier introuvable sur le stockage' });
  });
  stream.pipe(res);
}

const IMAGE_CONTENT_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const VIDEO_CONTENT_TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm' };

router.get('/photos/:filename', optionalAuth, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const photo = await prisma.photo.findFirst({
      where: { url: `/media/photos/${filename}` },
      include: { profile: true },
    });
    if (!photo) return res.status(404).json({ error: 'Photo introuvable' });

    const isOwner = req.user?.profile?.id === photo.profileId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      if (photo.moderationStatus !== 'APPROVED') return res.status(404).json({ error: 'Photo introuvable' });
      if (photo.isPrivate) {
        // Photo privée : jamais accessible sans compte, même via le parcours public.
        if (!req.user?.profile) return res.status(403).json({ error: 'Accès à cette photo privée non autorisé' });
        if (await isBlocked(req.user.profile.id, photo.profileId)) return res.status(404).json({ error: 'Photo introuvable' });
        const allowed = await canViewPrivatePhotos(photo.profile, req.user.profile.id);
        if (!allowed) return res.status(403).json({ error: 'Accès à cette photo privée non autorisé' });
      } else if (req.user?.profile && (await isBlocked(req.user.profile.id, photo.profileId))) {
        return res.status(404).json({ error: 'Photo introuvable' });
      } else if (!photo.profile.visible) {
        // Photo publique d'un profil masqué : réservée aux membres connectés (parcours interne).
        if (!req.user) return res.status(404).json({ error: 'Photo introuvable' });
      }
    }

    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    streamFile(res, filename, IMAGE_CONTENT_TYPES[ext] || 'application/octet-stream');
  } catch (err) {
    next(err);
  }
});

// Photo envoyée dans une discussion privée du Sexmo Tchat. Le fil lui-même
// n'est pas persisté (voir sockets/chat.js) : on ne peut donc pas vérifier
// ici que le lecteur est l'un des deux participants, seulement que le
// fichier a bien été déposé via /api/chat/photo (pas un accès direct au
// dossier de stockage). Nom de fichier en UUID aléatoire, non listable.
router.get('/chat-photos/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const photo = await prisma.chatPhoto.findFirst({ where: { url: `/media/chat-photos/${filename}` } });
    if (!photo) return res.status(404).json({ error: 'Photo introuvable' });

    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    streamFile(res, filename, IMAGE_CONTENT_TYPES[ext] || 'application/octet-stream');
  } catch (err) {
    next(err);
  }
});

// Photo d'une galerie du back-office (voir adminGalleries.routes.js). Simple
// contenu éditorial géré par l'admin, pas de vérification de propriétaire.
router.get('/gallery-photos/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const photo = await prisma.galleryPhoto.findFirst({ where: { url: `/media/gallery-photos/${filename}` } });
    if (!photo) return res.status(404).json({ error: 'Photo introuvable' });

    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    streamFile(res, filename, IMAGE_CONTENT_TYPES[ext] || 'application/octet-stream');
  } catch (err) {
    next(err);
  }
});

router.get('/videos/:filename', optionalAuth, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const video = await prisma.video.findFirst({ where: { url: `/media/videos/${filename}` }, include: { profile: true } });
    if (!video) return res.status(404).json({ error: 'Vidéo introuvable' });

    const isOwner = req.user?.profile?.id === video.profileId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      if (video.moderationStatus !== 'APPROVED') return res.status(404).json({ error: 'Vidéo introuvable' });
      if (req.user?.profile && (await isBlocked(req.user.profile.id, video.profileId))) {
        return res.status(404).json({ error: 'Vidéo introuvable' });
      }
      if (!video.profile.visible && !req.user) {
        return res.status(404).json({ error: 'Vidéo introuvable' });
      }
    }

    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    streamFile(res, filename, VIDEO_CONTENT_TYPES[ext] || 'application/octet-stream');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
