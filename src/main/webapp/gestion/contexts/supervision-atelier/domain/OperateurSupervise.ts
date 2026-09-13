import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { AnomalieDeSupervision } from './AnomalieDeSupervision';
import { EtatDePresence } from './EtatDePresence';
import { OperateurDeclare } from './OperateurDeclare';

export class OperateurSupervise {
  constructor(
    readonly operateur: OperateurDeclare,
    readonly presence: EtatDePresence,
    readonly activites: readonly ActiviteDeSupervision[] = [],
    readonly anomalies: readonly AnomalieDeSupervision[] = [],
  ) {}

  compareAlphabetically(other: OperateurSupervise): number {
    return this.operateur.compareAlphabetically(other.operateur);
  }

  estEnGlm(): boolean {
    return this.presence === 'PRESENT' && this.activites.length === 0;
  }
}
