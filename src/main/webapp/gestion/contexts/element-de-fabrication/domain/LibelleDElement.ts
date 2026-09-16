const MAX_LONGUEUR_ENREGISTREE = 1000;
const MAX_LONGUEUR_SAISIE = 100;

const longueurEnregistrableInvalide = (value: string): boolean => {
  const longueur = value.trim().length;
  return longueur === 0 || longueur > MAX_LONGUEUR_ENREGISTREE;
};

export class LibelleDElement {
  readonly value: string;

  constructor(value: string) {
    if (longueurEnregistrableInvalide(value)) {
      throw new Error('Le libellé est limité à 1000 caractères.');
    }
    this.value = value.trim();
  }

  static erreur(value: string): string | undefined {
    return value.trim().length > MAX_LONGUEUR_SAISIE ? 'Le libellé tient sur une ligne : 100 caractères au plus.' : undefined;
  }
}
