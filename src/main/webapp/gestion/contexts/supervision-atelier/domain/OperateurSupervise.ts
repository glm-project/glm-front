import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { EtatDePresence } from './EtatDePresence';
import { Instant } from './Instant';
import { OperateurDeclare } from './OperateurDeclare';
import { SegmentDePresence } from './SegmentDePresence';

export interface SituationOperateur {
  readonly activites: readonly ActiviteDeSupervision[];
  readonly anomalies: readonly AnomalieDeSupervision[];
  readonly heureDOuverture?: Instant | undefined;
  readonly segments?: readonly SegmentDePresence[] | undefined;
}

export class OperateurSupervise {
  readonly activites: readonly ActiviteDeSupervision[];
  readonly anomalies: readonly AnomalieDeSupervision[];
  readonly heureDOuverture: Instant | undefined;
  readonly segments: readonly SegmentDePresence[];

  constructor(
    readonly operateur: OperateurDeclare,
    readonly presence: EtatDePresence,
    situation: SituationOperateur,
  ) {
    this.activites = [...situation.activites];
    this.anomalies = [...situation.anomalies];
    this.heureDOuverture = situation.heureDOuverture;
    this.segments = situation.segments ? [...situation.segments] : [];
  }

  compareAlphabetically(other: OperateurSupervise): number {
    return this.operateur.compareAlphabetically(other.operateur);
  }

  isEnGlm(): boolean {
    return this.presence === 'PRESENT' && this.activites.length === 0;
  }

  isSansJourneeOuverte(): boolean {
    return this.presence === 'ABSENT' && this.activites.length === 0 && this.anomalies.length === 0;
  }
}
