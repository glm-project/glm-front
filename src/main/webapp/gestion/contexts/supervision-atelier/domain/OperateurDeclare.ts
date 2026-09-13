import { IdentifiantOperateur } from './IdentifiantOperateur';

export class OperateurDeclare {
  constructor(
    readonly id: IdentifiantOperateur,
    readonly nom: string,
    readonly prenom: string,
  ) {}

  compareAlphabetically(other: OperateurDeclare): number {
    const comparisonNom = this.nom.localeCompare(other.nom, 'fr');
    if (comparisonNom !== 0) {
      return comparisonNom;
    }
    return this.prenom.localeCompare(other.prenom, 'fr');
  }
}
