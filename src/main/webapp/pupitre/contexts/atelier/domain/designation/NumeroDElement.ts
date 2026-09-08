import { SuiviDuPupitre } from '../journal-du-pupitre/JournalDuPupitre';

export class NumeroDElement {
  private constructor(
    private readonly valeur: string,
    private readonly repli: boolean,
  ) {}

  static attribue(reference: string): NumeroDElement {
    return new NumeroDElement(reference, false);
  }

  static genere(nom: string): NumeroDElement {
    return new NumeroDElement(nom, true);
  }

  static from(suivi: SuiviDuPupitre): NumeroDElement {
    return suivi.reference === undefined ? NumeroDElement.genere(suivi.nom) : NumeroDElement.attribue(suivi.reference);
  }

  isRepliSurNom(): boolean {
    return this.repli;
  }

  compare(other: NumeroDElement): number {
    return this.valeur.localeCompare(other.valeur, 'fr', { numeric: true, sensitivity: 'base' });
  }

  toString(): string {
    return this.valeur;
  }
}
