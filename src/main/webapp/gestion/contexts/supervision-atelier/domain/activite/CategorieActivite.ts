export type ValeurCategorieActivite = 'TRAVAIL' | 'NON_CONFORMITE';

export class CategorieActivite {
  constructor(readonly value: ValeurCategorieActivite) {}

  isNc(): boolean {
    return this.value === 'NON_CONFORMITE';
  }
}
