import { IdentiteOperateur } from './IdentiteOperateur';
import { OperateurReleveId } from './OperateurReleveId';

export interface OperateurDuReleve {
  readonly id: OperateurReleveId;
  readonly identite: IdentiteOperateur;
}
