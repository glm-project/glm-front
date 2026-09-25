import { NatureDeTravail } from '../poste/NatureDeTravail';
import { IdentifiantOperateur } from './IdentifiantOperateur';

export interface DescriptionOperateur {
  readonly id: IdentifiantOperateur;
  readonly nom: string;
  readonly prenom: string;
  readonly metiers?: readonly NatureDeTravail[];
}

export class OperateurDeclare {
  readonly id: IdentifiantOperateur;
  readonly nom: string;
  readonly prenom: string;
  readonly metiers: readonly NatureDeTravail[];

  constructor(description: DescriptionOperateur) {
    this.id = description.id;
    this.nom = description.nom;
    this.prenom = description.prenom;
    this.metiers = [...(description.metiers ?? [])];
  }

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
