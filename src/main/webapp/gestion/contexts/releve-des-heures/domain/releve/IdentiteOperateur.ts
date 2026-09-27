const estVide = (valeur: string): boolean => valeur.trim().length === 0;

const estIncomplete = (nom: string, prenom: string): boolean => estVide(nom) || estVide(prenom);

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
