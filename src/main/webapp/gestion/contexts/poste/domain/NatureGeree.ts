import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { PosteDeTravail } from './PosteDeTravail';

export class NatureGeree {
  constructor(
    readonly id: NatureDeTravailId,
    readonly libelle: NatureDeTravail,
    readonly postes: number,
  ) {}

  porte(poste: PosteDeTravail): boolean {
    return poste.nature.value === this.libelle.value;
  }
}
