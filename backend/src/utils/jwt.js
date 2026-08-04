const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

// Jeton séparé, courte durée, pour charger les photos/vidéos via de simples
// balises <img>/<video> (qui ne peuvent pas envoyer d'en-tête Authorization) —
// passé en paramètre d'URL (?token=...). Étendue volontairement réduite par
// rapport au token de session pour limiter sa présence dans les logs d'accès.
function signMediaToken(userId) {
  return jwt.sign({ userId, scope: 'media' }, SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, signMediaToken, verifyToken };
