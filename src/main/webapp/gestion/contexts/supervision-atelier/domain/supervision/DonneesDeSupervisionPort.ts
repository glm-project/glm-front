import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { SequenceEnConflit } from '../activite/SequenceEnConflit';
import { OperateurDeclare } from '../operateur/OperateurDeclare';

export interface DonneesDeSupervision {
  readonly operateurs: readonly OperateurDeclare[];
  readonly sequencesEnConflit: readonly SequenceEnConflit[];
  readonly activites: readonly ActiviteDeSupervision[];
}

export abstract class DonneesDeSupervisionPort {
  abstract read(): Promise<DonneesDeSupervision>;
}
