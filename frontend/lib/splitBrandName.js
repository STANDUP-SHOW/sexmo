// Découpe un nom de marque façon "LibertineConnect" -> ["Libertine", "Connect"]
// en cherchant la première majuscule après le premier caractère, pour un
// rendu bicolore (rose + blanc) dans le header. Si aucune coupure naturelle
// n'est trouvée (nom en un seul mot, tout en minuscules...), tout le nom part
// dans la première couleur.
export function splitBrandName(name) {
  if (!name) return ['', ''];
  const match = name.slice(1).match(/[A-Z]/);
  if (!match) return [name, ''];
  const splitIndex = match.index + 1;
  return [name.slice(0, splitIndex), name.slice(splitIndex)];
}
