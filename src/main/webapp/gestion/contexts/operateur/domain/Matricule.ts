export class Matricule {
  readonly value: string;

  constructor(value: string) {
    const erreur = Matricule.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    const longueur = value.trim().length;
    return longueur === 0 || longueur > 50 ? 'Le matricule est limité à 50 caractères.' : undefined;
  }
}
