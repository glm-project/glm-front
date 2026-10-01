import { Identifiant } from './Identifiant';
import { NomOperateur } from './NomOperateur';
import { PosteHabilitableId } from './PosteHabilitableId';
import { PrenomOperateur } from './PrenomOperateur';
import { TauxHoraire } from './TauxHoraire';

export interface CommandeCreationOperateur {
  readonly type: 'CREATION';
  readonly nom: NomOperateur;
  readonly prenom: PrenomOperateur;
  readonly identifiant: Identifiant | undefined;
  readonly tauxHoraire: TauxHoraire | undefined;
  readonly postes: readonly PosteHabilitableId[];
}
