// Présence en ligne des membres, en mémoire uniquement : qui a au moins une
// connexion active sur le namespace socket principal (voir sockets/index.js,
// réservé aux comptes authentifiés avec profil). Un même membre peut avoir
// plusieurs onglets/appareils ouverts, d'où le comptage par socket plutôt
// qu'un simple booléen — on ne le considère hors ligne que lorsque la
// dernière connexion se ferme.
const socketsByProfile = new Map(); // profileId -> Set<socketId>

function addSocket(profileId, socketId) {
  if (!socketsByProfile.has(profileId)) socketsByProfile.set(profileId, new Set());
  socketsByProfile.get(profileId).add(socketId);
}

function removeSocket(profileId, socketId) {
  const set = socketsByProfile.get(profileId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) socketsByProfile.delete(profileId);
}

function isOnline(profileId) {
  return socketsByProfile.has(profileId);
}

module.exports = { addSocket, removeSocket, isOnline };
