import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravail } from './NatureDeTravail';
import { NatureDeTravailId } from './NatureDeTravailId';

export interface CommandeCreationPoste {
  readonly type: 'CREATION';
  readonly libelle: LibellePoste;
  readonly nature: NatureDeTravail;
  readonly natureId: NatureDeTravailId;
  readonly coutHoraire: CoutHoraire | undefined;
}
