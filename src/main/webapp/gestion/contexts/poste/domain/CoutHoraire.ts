export class CoutHoraire {
  constructor(readonly value: number) {
    const erreur = CoutHoraire.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
  }

  static erreur(value: number): string | undefined {
    return Number.isFinite(value) && value > 0 ? undefined : 'Le coût horaire doit être un nombre strictement positif.';
  }

  equals(other: CoutHoraire | undefined): boolean {
    return other !== undefined && this.value === other.value;
  }
}
