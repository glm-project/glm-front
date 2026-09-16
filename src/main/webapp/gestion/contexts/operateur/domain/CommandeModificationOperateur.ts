import { Matricule } from './Matricule';
import { NomOperateur } from './NomOperateur';
import { OperateurId } from './OperateurId';
import { PosteHabilitableId } from './PosteHabilitableId';
import { PrenomOperateur } from './PrenomOperateur';
import { TauxHoraire } from './TauxHoraire';

export interface CommandeModificationOperateur {
  readonly type: 'MODIFICATION';
  readonly id: OperateurId;
  readonly nom: NomOperateur;
  readonly prenom: PrenomOperateur;
  readonly matricule: Matricule | undefined;
  readonly tauxHoraire: TauxHoraire | undefined;
  readonly postes: readonly PosteHabilitableId[];
}
