import { Instant } from '../instant/Instant';
import { IdentifiantOperateur } from '../operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { PosteDeSupervision } from '../poste/PosteDeSupervision';
import { CategorieActivite } from './CategorieActivite';
import { EtatActiviteDeSupervision } from './EtatActiviteDeSupervision';
import { IdentifiantActivite } from './IdentifiantActivite';
import { ObjetDeLActivite } from './ObjetDeLActivite';

const rangDuPoste = (poste: PosteDeSupervision | undefined): number => (poste === undefined ? 1 : 0);

const comparePostes = (poste: PosteDeSupervision | undefined, autre: PosteDeSupervision | undefined): number =>
  poste === undefined || autre === undefined
    ? rangDuPoste(poste) - rangDuPoste(autre)
    : poste.libelle.localeCompare(autre.libelle, 'fr', { numeric: true });

const DUREE_AVANT_FIN_AUTOMATIQUE_MS = 13 * 60 * 60 * 1000;

export interface DescriptionActivite {
  readonly id: IdentifiantActivite;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly objet: ObjetDeLActivite;
  readonly categorie: CategorieActivite;
  readonly debut: Instant;
  readonly poste?: PosteDeSupervision;
  readonly etat?: EtatActiviteDeSupervision;
}

export class ActiviteDeSupervision {
  readonly id: IdentifiantActivite;
  readonly operateurId: IdentifiantOperateur | undefined;
  readonly objet: ObjetDeLActivite;
  readonly categorie: CategorieActivite;
  readonly debut: Instant;
  readonly poste: PosteDeSupervision | undefined;
  readonly echeance: Instant;
  private readonly etat: EtatActiviteDeSupervision;

  constructor(description: DescriptionActivite) {
    this.etat = description.etat ?? 'EN_COURS';
    this.id = description.id;
    this.operateurId = description.operateurId;
    this.objet = description.objet;
    this.categorie = description.categorie;
    this.debut = description.debut;
    this.poste = description.poste;
    this.echeance = new Instant(new Date(Date.parse(this.debut.value) + DUREE_AVANT_FIN_AUTOMATIQUE_MS).toISOString());
  }

  isEnCours(maintenant: Instant): boolean {
    return this.etatAt(maintenant) === 'EN_COURS';
  }

  isTermineeAutomatiquement(maintenant: Instant): boolean {
    return this.etatAt(maintenant) === 'TERMINEE_AUTOMATIQUEMENT';
  }

  private etatAt(maintenant: Instant): EtatActiviteDeSupervision {
    if (this.etat !== 'EN_COURS') {
      return this.etat;
    }
    return maintenant.compare(this.echeance) < 0 ? 'EN_COURS' : 'TERMINEE_AUTOMATIQUEMENT';
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
