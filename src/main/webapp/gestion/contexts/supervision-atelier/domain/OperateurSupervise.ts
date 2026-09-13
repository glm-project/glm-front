import { EtatDePresence } from './EtatDePresence';
import { OperateurDeclare } from './OperateurDeclare';

export class OperateurSupervise {
  constructor(
    readonly operateur: OperateurDeclare,
    readonly presence: EtatDePresence,
  ) {}

  compareAlphabetically(other: OperateurSupervise): number {
    return this.operateur.compareAlphabetically(other.operateur);
  }
}
