// Où se trouve (si présent) un membre dans le Sexmo Tchat en ce moment,
// indépendamment du statut "en ligne" général du site (onlinePresence.js) :
// être connecté au site ne veut pas dire être dans un salon du tchat. Sert
// à savoir vers quel département rediriger le bouton "Tchatter" d'une fiche
// profil, et à ne pas l'activer si la personne n'y est pas du tout.
const departmentByProfile = new Map(); // profileId -> department

function setProfileDepartment(profileId, department) {
  if (!profileId) return;
  departmentByProfile.set(profileId, department);
}

function removeProfileDepartment(profileId) {
  if (!profileId) return;
  departmentByProfile.delete(profileId);
}

function getProfileDepartment(profileId) {
  return departmentByProfile.get(profileId) || null;
}

module.exports = { setProfileDepartment, removeProfileDepartment, getProfileDepartment };
