import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { SequenceEnConflit } from '../activite/SequenceEnConflit';
import { Instant } from '../instant/Instant';
import { OperateurDeclare } from '../operateur/OperateurDeclare';

export interface DonneesDeSupervision {
  readonly evaluation: Instant;
  readonly operateurs: readonly OperateurDeclare[];
  readonly sequencesEnConflit: readonly SequenceEnConflit[];
  readonly activites: readonly ActiviteDeSupervision[];
}

export abstract class DonneesDeSupervisionPort {
  abstract read(): Promise<DonneesDeSupervision>;
}
