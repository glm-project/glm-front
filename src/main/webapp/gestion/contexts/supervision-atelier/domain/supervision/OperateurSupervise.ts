import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { SequenceEnConflit } from '../activite/SequenceEnConflit';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { CouloirDeSupervision } from './CouloirDeSupervision';

export interface SituationOperateur {
  readonly activites: readonly ActiviteDeSupervision[];
  readonly termineesAutomatiquement: readonly ActiviteDeSupervision[];
  readonly sequencesEnConflit: readonly SequenceEnConflit[];
}

export class OperateurSupervise {
  readonly sequencesEnConflit: readonly SequenceEnConflit[];
  readonly activites: readonly ActiviteDeSupervision[];
  readonly activitesTermineesAutomatiquement: readonly ActiviteDeSupervision[];

  constructor(
    readonly operateur: OperateurDeclare,
    situation: SituationOperateur,
  ) {
    this.activites = [...situation.activites].sort((left, right) => left.compare(right));
    this.activitesTermineesAutomatiquement = [...situation.termineesAutomatiquement].sort((left, right) => left.compare(right));
    this.sequencesEnConflit = [...situation.sequencesEnConflit];
  }

  isAVerifier(): boolean {
    return this.activitesTermineesAutomatiquement.length > 0 || this.sequencesEnConflit.length > 0;
  }

  compareAlphabetically(other: OperateurSupervise): number {
    return this.operateur.compareAlphabetically(other.operateur);
  }

  couloir(): CouloirDeSupervision {
    return this.activites.length > 0 ? 'AU_TRAVAIL' : 'SANS_ACTIVITE';
  }

  isEnNonConformite(): boolean {
    return this.activites.some(activite => activite.categorie.isNc());
  }
}
