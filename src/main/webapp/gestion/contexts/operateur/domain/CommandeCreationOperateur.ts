import { Matricule } from './Matricule';
import { NomOperateur } from './NomOperateur';
import { PosteHabilitableId } from './PosteHabilitableId';
import { PrenomOperateur } from './PrenomOperateur';
import { TauxHoraire } from './TauxHoraire';

export interface CommandeCreationOperateur {
  readonly type: 'CREATION';
  readonly nom: NomOperateur;
  readonly prenom: PrenomOperateur;
  readonly matricule: Matricule | undefined;
  readonly tauxHoraire: TauxHoraire | undefined;
  readonly postes: readonly PosteHabilitableId[];
}
