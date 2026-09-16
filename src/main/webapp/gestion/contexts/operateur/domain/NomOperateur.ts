export class NomOperateur {
  readonly value: string;

  constructor(value: string) {
    const erreur = NomOperateur.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    const longueur = value.trim().length;
    return longueur === 0 || longueur > 100 ? 'Le nom est obligatoire et limité à 100 caractères.' : undefined;
  }
}
