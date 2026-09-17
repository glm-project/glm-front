const estVide = (valeur: string): boolean => valeur.trim().length === 0;

const estIncomplete = (nom: string, prenom: string): boolean => estVide(nom) || estVide(prenom);

/** Le nom et le prénom que le rapport a résolus au référentiel. Le matricule n'y figure pas. */
export class IdentiteOperateur {
  constructor(
    readonly nom: string,
    readonly prenom: string,
  ) {
    if (estIncomplete(nom, prenom)) {
      throw new Error('L’opérateur reçu du serveur n’a pas d’identité complète.');
    }
  }
}
