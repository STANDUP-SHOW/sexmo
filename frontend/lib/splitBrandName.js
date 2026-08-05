// Découpe un nom de marque façon "LibertineConnect" -> ["Libertine", "Connect"]
// en cherchant la première majuscule après le premier caractère, pour un
// rendu bicolore (rose + blanc) dans le header. Si aucune coupure naturelle
// n'est trouvée (nom en un seul mot, tout en minuscules, ex. "sexmo"), on
// coupe au milieu pour garder un logo toujours bicolore.
export function splitBrandName(name) {
  if (!name) return ['', ''];
  const match = name.slice(1).match(/[A-Z]/);
  const splitIndex = match ? match.index + 1 : Math.ceil(name.length / 2);
  return [name.slice(0, splitIndex), name.slice(splitIndex)];
}
