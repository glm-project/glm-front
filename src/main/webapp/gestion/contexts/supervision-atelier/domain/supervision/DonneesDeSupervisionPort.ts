import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { Instant } from '../instant/Instant';
import { OperateurDeclare } from '../operateur/OperateurDeclare';

export interface DonneesDeSupervision {
  readonly evaluation: Instant;
  readonly operateurs: readonly OperateurDeclare[];
  readonly activites: readonly ActiviteDeSupervision[];
}

export abstract class DonneesDeSupervisionPort {
  abstract read(): Promise<DonneesDeSupervision>;
}
