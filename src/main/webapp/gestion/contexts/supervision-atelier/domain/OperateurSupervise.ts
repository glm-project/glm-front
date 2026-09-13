import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { EtatDePresence } from './EtatDePresence';
import { Instant } from './Instant';
import { OperateurDeclare } from './OperateurDeclare';

export interface SituationOperateur {
  readonly activites: readonly ActiviteDeSupervision[];
  readonly anomalies: readonly AnomalieDeSupervision[];
  readonly heureDOuverture?: Instant | undefined;
}

export class OperateurSupervise {
  readonly activites: readonly ActiviteDeSupervision[];
  readonly anomalies: readonly AnomalieDeSupervision[];
  readonly heureDOuverture: Instant | undefined;

  constructor(
    readonly operateur: OperateurDeclare,
    readonly presence: EtatDePresence,
    situation: SituationOperateur,
  ) {
    this.activites = [...situation.activites];
    this.anomalies = [...situation.anomalies];
    this.heureDOuverture = situation.heureDOuverture;
  }

  compareAlphabetically(other: OperateurSupervise): number {
    return this.operateur.compareAlphabetically(other.operateur);
  }

  isEnGlm(): boolean {
    return this.presence === 'PRESENT' && this.activites.length === 0;
  }
}
