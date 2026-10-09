export class NatureDeTravail {
  readonly value: string;

  constructor(value: string) {
    const erreur = NatureDeTravail.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    const longueur = value.trim().length;
    return longueur === 0 || longueur > 50 ? 'La nature est obligatoire et limitée à 50 caractères.' : undefined;
  }

  cleNormalisee(): string {
    return this.value.toLocaleLowerCase('fr');
  }

  correspondA(recherche: string): boolean {
    return this.cleNormalisee().includes(recherche.trim().toLocaleLowerCase('fr'));
  }
}
