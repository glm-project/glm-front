const MOTIF_DU_CODE = /^[A-Z]{1,10}$/;

export class CategorieDeProduit {
  readonly value: string;

  constructor(value: string) {
    const erreur = CategorieDeProduit.erreur(value);
    if (erreur !== undefined) {
      throw new Error(erreur);
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    return MOTIF_DU_CODE.test(value.trim()) ? undefined : 'Le code tient en 1 à 10 lettres majuscules, sans accent ni espace.';
  }

  estLaMeme(autre: CategorieDeProduit): boolean {
    return this.value === autre.value;
  }
}
