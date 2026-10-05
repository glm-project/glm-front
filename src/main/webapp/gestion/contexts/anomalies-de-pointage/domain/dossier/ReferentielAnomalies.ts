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

  poste(id: PosteAnomalieId): PosteAnomalie | undefined {
    return this.postes.find(poste => poste.id.equals(id));
  }

  postesHabilites(operateur: OperateurAnomalieId): readonly PosteAnomalie[] {
    return this.postes.filter(poste => this.estHabilite(operateur, poste));
  }

  autresPostes(operateur: OperateurAnomalieId): readonly PosteAnomalie[] {
    return this.postes.filter(poste => !this.estHabilite(operateur, poste));
  }

  private estHabilite(operateur: OperateurAnomalieId, poste: PosteAnomalie): boolean {
    return this.operateur(operateur)?.postesHabilites.some(habilite => habilite.equals(poste.id)) ?? false;
  }
}
