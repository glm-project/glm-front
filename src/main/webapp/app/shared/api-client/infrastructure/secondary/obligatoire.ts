export const obligatoire = <T>(valeur: T | undefined, champ: string): T => {
  if (valeur === undefined) {
    throw new Error(`${champ} manque dans la réponse du serveur`);
  }

  return valeur;
};
