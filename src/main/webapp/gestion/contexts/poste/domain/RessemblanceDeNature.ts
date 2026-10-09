const PREFIXE_COMMUN = 4;
const DISTANCE_MAXIMALE = 2;

const cle = (libelle: string): string =>
  libelle.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('fr-FR');

const prefixeCommun = (gauche: string, droite: string): number => {
  let longueur = 0;
  while (longueur < Math.min(gauche.length, droite.length) && gauche.charAt(longueur) === droite.charAt(longueur)) {
    longueur += 1;
  }
  return longueur;
};

const aPeuDeModifications = (gauche: string, droite: string, budget: number): boolean => {
  if (gauche === droite) {
    return true;
  }
  if (budget === 0) {
    return false;
  }
  if (gauche.charAt(0) === droite.charAt(0)) {
    return aPeuDeModifications(gauche.slice(1), droite.slice(1), budget);
  }
  return (
    aPeuDeModifications(gauche.slice(1), droite, budget - 1)
    || aPeuDeModifications(gauche, droite.slice(1), budget - 1)
    || aPeuDeModifications(gauche.slice(1), droite.slice(1), budget - 1)
  );
};

export const memeNom = (gauche: string, droite: string): boolean => cle(gauche) === cle(droite);

export const ressemble = (gauche: string, droite: string): boolean => {
  const a = cle(gauche);
  const b = cle(droite);
  if (a === b) {
    return false;
  }
  return prefixeCommun(a, b) >= PREFIXE_COMMUN || aPeuDeModifications(a, b, DISTANCE_MAXIMALE);
};
