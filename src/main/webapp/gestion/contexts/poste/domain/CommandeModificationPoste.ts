import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { PosteDeTravailId } from './PosteDeTravailId';

export interface CommandeModificationPoste {
  readonly id: PosteDeTravailId;
  readonly libelle: LibellePoste;
  readonly nature: NatureDeTravail;
  readonly coutHoraire: CoutHoraire | undefined;
}
