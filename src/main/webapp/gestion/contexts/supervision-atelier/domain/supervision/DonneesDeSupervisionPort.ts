import { ActiviteDeSupervision } from '../activite/ActiviteDeSupervision';
import { OperateurDeclare } from '../operateur/OperateurDeclare';
import { JourneeDeTravail } from '../presence/JourneeDeTravail';

export interface DonneesDeSupervision {
  readonly operateurs: readonly OperateurDeclare[];
  readonly journees: readonly JourneeDeTravail[];
  readonly activites: readonly ActiviteDeSupervision[];
}

export abstract class DonneesDeSupervisionPort {
  abstract read(): Promise<DonneesDeSupervision>;
}
