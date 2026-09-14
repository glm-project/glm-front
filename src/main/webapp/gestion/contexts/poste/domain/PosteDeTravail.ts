import { CommandeEnregistrementPoste } from './CommandeEnregistrementPoste';
import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';

export class PosteDeTravail {
  readonly libelle: LibellePoste;
  readonly nature: NatureDeTravail;
  readonly coutHoraire: CoutHoraire | undefined;

  constructor(
    readonly id: PosteDeTravailId,
    configuration: CommandeEnregistrementPoste,
  ) {
    this.libelle = configuration.libelle;
    this.nature = configuration.nature;
    this.coutHoraire = configuration.coutHoraire;
  }
}
