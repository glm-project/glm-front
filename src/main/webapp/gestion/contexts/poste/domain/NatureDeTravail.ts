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

  equals(other: NatureDeTravail | undefined): boolean {
    return other !== undefined && this.value === other.value;
  }

  compare(other: NatureDeTravail): number {
    return this.value.localeCompare(other.value, 'fr');
  }

  correspondA(recherche: string): boolean {
    return this.value.toLocaleLowerCase('fr').includes(recherche.trim().toLocaleLowerCase('fr'));
  }
}
