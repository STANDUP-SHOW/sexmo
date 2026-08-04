export function memberSinceLabel(days) {
  if (days == null) return null;
  if (days < 7) return 'Nouveau membre';
  if (days < 30) {
    const weeks = Math.max(1, Math.floor(days / 7));
    return `Membre depuis ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `Membre depuis ${months} mois`;
  }
  const years = Math.floor(days / 365);
  return `Membre depuis ${years} an${years > 1 ? 's' : ''}`;
}
