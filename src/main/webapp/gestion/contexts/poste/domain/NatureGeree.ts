import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { PosteDeTravail } from './PosteDeTravail';

export interface UsageDeNature {
  readonly utilisee: boolean;
  readonly postes: number;
}

export class NatureGeree {
  readonly utilisee: boolean;
  readonly postes: number;

  constructor(
    readonly id: NatureDeTravailId,
    readonly libelle: NatureDeTravail,
    usage: UsageDeNature,
  ) {
    this.utilisee = usage.utilisee;
    this.postes = usage.postes;
  }

  get supprimable(): boolean {
    return !this.utilisee;
  }

  porte(poste: PosteDeTravail): boolean {
    return poste.nature.value === this.libelle.value;
  }
}
