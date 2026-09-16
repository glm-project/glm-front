export class TauxHoraire {
  constructor(readonly value: number) {
    const erreur = TauxHoraire.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
  }

  static erreur(value: number): string | undefined {
    return Number.isFinite(value) && value > 0 ? undefined : 'Le taux horaire doit être un nombre strictement positif.';
  }
}
