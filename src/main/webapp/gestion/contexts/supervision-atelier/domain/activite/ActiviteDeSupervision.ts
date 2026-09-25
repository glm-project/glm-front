import { Instant } from '../instant/Instant';
import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { CategorieActivite } from './CategorieActivite';
import { IdentifiantActivite } from './IdentifiantActivite';
import { ObjetDeLActivite } from './ObjetDeLActivite';

const rangDuPoste = (poste: string | undefined): number => (poste === undefined ? 1 : 0);

const comparePostes = (poste: string | undefined, autre: string | undefined): number =>
  rangDuPoste(poste) - rangDuPoste(autre) || (poste ?? '').localeCompare(autre ?? '', 'fr', { numeric: true });

export interface DescriptionActivite {
  readonly id: IdentifiantActivite;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly objet: ObjetDeLActivite;
  readonly categorie: CategorieActivite;
  readonly debut: Instant;
  readonly poste?: string;
}

export class ActiviteDeSupervision {
  readonly id: IdentifiantActivite;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly objet: ObjetDeLActivite;
  readonly categorie: CategorieActivite;
  readonly debut: Instant;
  readonly poste: string | undefined;

  constructor(description: DescriptionActivite) {
    this.id = description.id;
    this.operateurId = description.operateurId;
    this.objet = description.objet;
    this.categorie = description.categorie;
    this.debut = description.debut;
    this.poste = description.poste;
  }

  compare(other: ActiviteDeSupervision): number {
    return comparePostes(this.poste, other.poste) || this.debut.compare(other.debut) || this.id.value.localeCompare(other.id.value);
  }

  isFor(operateurId: IdentifiantOperateur): boolean {
    return this.operateurId?.equals(operateurId) === true;
  }

  hasOperateurIdentifiable(operateursDeclares: readonly OperateurDeclare[]): boolean {
    return operateursDeclares.some(operateur => this.isFor(operateur.id));
  }
}
