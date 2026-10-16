import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravailId } from './NatureDeTravailId';

export interface CommandeCreationPoste {
  readonly type: 'CREATION';
  readonly libelle: LibellePoste;
  readonly natureId: NatureDeTravailId;
  readonly coutHoraire: CoutHoraire;
}
