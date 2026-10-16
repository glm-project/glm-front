import { CoutHoraire } from './CoutHoraire';
import { LibellePoste } from './LibellePoste';
import { NatureDeTravailId } from './NatureDeTravailId';
import { PosteDeTravailId } from './PosteDeTravailId';

export interface CommandeModificationPoste {
  readonly type: 'MODIFICATION';
  readonly id: PosteDeTravailId;
  readonly libelle: LibellePoste;
  readonly natureId: NatureDeTravailId;
  readonly coutHoraire: CoutHoraire;
}
