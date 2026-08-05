const prisma = require('../config/prisma');
const { verifyToken } = require('../utils/jwt');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    // Le token peut aussi venir en paramètre d'URL (?token=...) : nécessaire
    // pour /media/*, chargé par de simples balises <img>/<video> qui ne
    // peuvent pas envoyer d'en-tête Authorization.
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || null;
    if (!token) return res.status(401).json({ error: 'Non authentifié' });

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true },
    });

    if (!user) return res.status(401).json({ error: 'Non authentifié' });
    if (user.status === 'BANNED') return res.status(403).json({ error: 'Compte banni' });
    if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Compte suspendu' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session invalide' });
  }
}

// Comme requireAuth, mais laisse passer les visiteurs non connectés
// (req.user reste undefined) au lieu de répondre 401 — utilisé par les
// routes accessibles sans compte (parcours public, médias publics).
async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || null;
    if (!token) return next();

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true },
    });
    if (user && user.status === 'ACTIVE') req.user = user;
    next();
  } catch (err) {
    next();
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Réservé aux administrateurs' });
  }
  next();
}

function requireProfile(req, res, next) {
  if (!req.user.profile) {
    return res.status(400).json({ error: 'Profil non créé' });
  }
  next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin, requireProfile };
