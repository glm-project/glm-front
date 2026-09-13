import { ActiviteDeSupervision } from './ActiviteDeSupervision';
import { JourneeDeTravail } from './JourneeDeTravail';
import { OperateurDeclare } from './OperateurDeclare';

export interface DonneesDeSupervision {
  readonly operateurs: readonly OperateurDeclare[];
  readonly journees: readonly JourneeDeTravail[];
  readonly activites: readonly ActiviteDeSupervision[];
}

export type LectureDeSupervision =
  { readonly status: 'complete'; readonly donnees: DonneesDeSupervision } | { readonly status: 'incomplete' };

export abstract class DonneesDeSupervisionPort {
  abstract read(): Promise<LectureDeSupervision>;
}
