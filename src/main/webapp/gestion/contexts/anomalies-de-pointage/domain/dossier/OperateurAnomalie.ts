import { OperateurAnomalieId } from './OperateurAnomalieId';

export interface OperateurAnomalie {
  readonly id: OperateurAnomalieId;
  readonly nom: string;
  readonly code?: string;
}
