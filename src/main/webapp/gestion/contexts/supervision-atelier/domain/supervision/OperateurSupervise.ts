import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { Instant } from '../instant/Instant';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { EtatDePresence } from '../presence/EtatDePresence';
import { SegmentDePresence } from '../presence/SegmentDePresence';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { CouloirDeSupervision } from './CouloirDeSupervision';

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
  private readonly segments: readonly SegmentDePresence[];

  constructor(
    readonly operateur: OperateurDeclare,
    readonly presence: EtatDePresence,
    situation: SituationOperateur,
  ) {
    this.activites = [...situation.activites].sort((left, right) => left.compare(right));
    this.anomalies = [...situation.anomalies];
    this.heureDOuverture = situation.heureDOuverture;
    this.segments = situation.segments ? [...situation.segments] : [];
  }

  compareAlphabetically(other: OperateurSupervise): number {
    return this.operateur.compareAlphabetically(other.operateur);
  }

  couloir(): CouloirDeSupervision {
    if (this.presence !== 'PRESENT') {
      return this.presence;
    }
    return this.activites.length > 0 ? 'AU_TRAVAIL' : 'SANS_AFFECTATION';
  }

  isEnNonConformite(): boolean {
    return this.hasJourneeOuverte() && this.activites.some(activite => activite.categorie.isNc());
  }

  private hasJourneeOuverte(): boolean {
    return this.presence !== 'ABSENT';
  }

  hasActivitesSuspendues(): boolean {
    return this.presence === 'EN_PAUSE' && this.activites.length > 0;
  }

  debutDeLaPauseEnCours(): Instant | undefined {
    return this.segments.find(segment => segment.pause && segment.enCours)?.debut;
  }
}
