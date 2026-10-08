import { OperateurAnomalieId } from './OperateurAnomalieId';
import { PosteAnomalieId } from './PosteAnomalieId';

export interface PosteAnomalie {
  readonly id: PosteAnomalieId;
  readonly libelle: string;
}

export interface OperateurAnomalie {
  readonly id: OperateurAnomalieId;
  readonly nom: string;
  readonly code?: string;
  readonly postesHabilites: readonly PosteAnomalieId[];
}

export class ReferentielAnomalies {
  constructor(
    readonly operateurs: readonly OperateurAnomalie[],
    readonly postes: readonly PosteAnomalie[],
  ) {}

  operateur(id: OperateurAnomalieId): OperateurAnomalie | undefined {
    return this.operateurs.find(operateur => operateur.id.equals(id));
  }
}
