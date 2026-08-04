// Score déterministe (pas d'IA) : 5 critères simples et transparents.
function computeProfileQuality(profile, approvedPhotoCount) {
  const checks = [
    {
      ok: approvedPhotoCount >= 1,
      suggestion: 'Ajoutez au moins une photo (elle doit être validée par la modération).',
    },
    {
      ok: approvedPhotoCount >= 3,
      suggestion: 'Ajoutez au moins 3 photos validées pour un profil plus attractif.',
    },
    {
      ok: Boolean(profile.bio && profile.bio.trim().length >= 60),
      suggestion: 'Complétez votre bio (60 caractères minimum recommandés).',
    },
    {
      ok: (profile.interests || []).length >= 3,
      suggestion: "Ajoutez au moins 3 centres d'intérêt.",
    },
    {
      ok: Boolean(profile.city),
      suggestion: 'Renseignez votre ville.',
    },
  ];

  const score = checks.filter((c) => c.ok).length;
  const suggestions = checks.filter((c) => !c.ok).map((c) => c.suggestion);

  return { score, maxScore: checks.length, suggestions };
}

module.exports = { computeProfileQuality };
