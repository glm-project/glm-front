import { Matricule } from './Matricule';
import { NomOperateur } from './NomOperateur';
import { OperateurId } from './OperateurId';
import { PosteHabilitable } from './PosteHabilitable';
import { PrenomOperateur } from './PrenomOperateur';
import { TauxHoraire } from './TauxHoraire';

export interface ConfigurationOperateur {
  readonly nom: NomOperateur;
  readonly prenom: PrenomOperateur;
  readonly matricule: Matricule | undefined;
  readonly tauxHoraire: TauxHoraire | undefined;
  readonly postes: readonly PosteHabilitable[];
  readonly natures: readonly string[];
}

export class Operateur {
  readonly nom: NomOperateur;
  readonly prenom: PrenomOperateur;
  readonly matricule: Matricule | undefined;
  readonly tauxHoraire: TauxHoraire | undefined;
  readonly postes: readonly PosteHabilitable[];
  readonly natures: readonly string[];

  constructor(
    readonly id: OperateurId,
    configuration: ConfigurationOperateur,
  ) {
    this.nom = configuration.nom;
    this.prenom = configuration.prenom;
    this.matricule = configuration.matricule;
    this.tauxHoraire = configuration.tauxHoraire;
    this.postes = configuration.postes;
    this.natures = configuration.natures;
  }
}
