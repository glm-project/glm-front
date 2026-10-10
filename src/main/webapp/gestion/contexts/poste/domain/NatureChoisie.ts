import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';

export interface NatureChoisie {
  readonly id: NatureDeTravailId;
  readonly libelle: NatureDeTravail;
}
