import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';

export interface CommandeCreationPoste {
  readonly libelle: LibellePoste;
  readonly nature: NatureDeTravail;
  readonly coutHoraire: CoutHoraire | undefined;
}
