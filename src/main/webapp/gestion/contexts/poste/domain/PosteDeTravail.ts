import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';
import { PosteDeTravailId } from './PosteDeTravailId';

export interface ConfigurationPoste {
  readonly libelle: LibellePoste;
  readonly nature: NatureDeTravail;
  readonly natureId: NatureDeTravailId;
  readonly coutHoraire: CoutHoraire | undefined;
}

export class PosteDeTravail {
  readonly libelle: LibellePoste;
  readonly nature: NatureDeTravail;
  readonly natureId: NatureDeTravailId;
  readonly coutHoraire: CoutHoraire | undefined;

  constructor(
    readonly id: PosteDeTravailId,
    configuration: ConfigurationPoste,
  ) {
    this.libelle = configuration.libelle;
    this.nature = configuration.nature;
    this.natureId = configuration.natureId;
    this.coutHoraire = configuration.coutHoraire;
  }
}
