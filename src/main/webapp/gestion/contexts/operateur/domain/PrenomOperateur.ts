export class PrenomOperateur {
  readonly value: string;

  constructor(value: string) {
    const erreur = PrenomOperateur.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    const longueur = value.trim().length;
    return longueur === 0 || longueur > 100 ? 'Le prénom est obligatoire et limité à 100 caractères.' : undefined;
  }
}
