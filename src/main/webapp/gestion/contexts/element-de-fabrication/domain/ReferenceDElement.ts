const MAX_LONGUEUR = 100;

export class ReferenceDElement {
  readonly value: string;

  constructor(value: string) {
    const erreur = ReferenceDElement.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    const longueur = value.trim().length;
    return longueur === 0 || longueur > MAX_LONGUEUR ? 'La référence est limitée à 100 caractères.' : undefined;
  }
}
