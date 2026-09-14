import { Instant } from '../instant/Instant';
import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { CategorieActivite } from './CategorieActivite';
import { IdentifiantActivite } from './IdentifiantActivite';

export interface DescriptionActivite {
  readonly id: IdentifiantActivite;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly nom: string;
  readonly categorie: CategorieActivite;
  readonly debut: Instant;
  readonly poste?: string;
}

export class ActiviteDeSupervision {
  readonly id: IdentifiantActivite;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly nom: string;
  readonly categorie: CategorieActivite;
  readonly debut: Instant;
  readonly poste: string | undefined;

  constructor(description: DescriptionActivite) {
    this.id = description.id;
    this.operateurId = description.operateurId;
    this.nom = description.nom;
    this.categorie = description.categorie;
    this.debut = description.debut;
    this.poste = description.poste;
  }

  isFor(operateurId: IdentifiantOperateur): boolean {
    return this.operateurId?.equals(operateurId) === true;
  }

  hasOperateurIdentifiable(operateursDeclares: readonly OperateurDeclare[]): boolean {
    return operateursDeclares.some(operateur => this.isFor(operateur.id));
  }
}
