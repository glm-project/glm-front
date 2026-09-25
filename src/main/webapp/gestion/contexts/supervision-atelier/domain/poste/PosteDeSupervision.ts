import { IdentifiantPoste } from './IdentifiantPoste';
import { NatureDeTravail } from './NatureDeTravail';

export interface DescriptionPoste {
  readonly id: IdentifiantPoste;
  readonly libelle: string;
  readonly nature?: NatureDeTravail;
}

export class PosteDeSupervision {
  readonly id: IdentifiantPoste;
  readonly libelle: string;
  readonly nature: NatureDeTravail | undefined;

  constructor(description: DescriptionPoste) {
    this.id = description.id;
    this.libelle = description.libelle;
    this.nature = description.nature;
  }
}
