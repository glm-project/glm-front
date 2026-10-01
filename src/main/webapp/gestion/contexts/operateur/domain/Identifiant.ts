export class Identifiant {
  readonly value: string;

  constructor(value: string) {
    const erreur = Identifiant.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    const longueur = value.trim().length;
    return longueur === 0 || longueur > 50 ? "L'identifiant est limité à 50 caractères." : undefined;
  }
}
