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
    const comparisonPrenom = this.prenom.localeCompare(other.prenom, 'fr');
    if (comparisonPrenom !== 0) {
      return comparisonPrenom;
    }
    return this.id.value.localeCompare(other.id.value);
  }
}
