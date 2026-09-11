import { OperateurDuPupitre, TypeDePointage } from '../../journal-du-pupitre/JournalDuPupitre';
import { Matricule } from '../Matricule';
import { DecisionDOuverture, HabilitationsDePoste } from './HabilitationsDePoste';

export interface IdentiteOperateurDesigne {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly matricule: string;
}

export class OperateurDesigne {
  private readonly identite: IdentiteOperateurDesigne;
  private readonly habilitations: HabilitationsDePoste;

  constructor(source: OperateurDuPupitre, code: Matricule) {
    this.identite = { id: source.id, nom: source.nom, prenom: source.prenom, matricule: code.toString() };
    this.habilitations = HabilitationsDePoste.from(source.postes);
  }

  identity(): IdentiteOperateurDesigne {
    return this.identite;
  }

  decideOuverture(type: TypeDePointage): DecisionDOuverture {
    return this.habilitations.decideOuverture(type);
  }

  owns(operateurId: string): boolean {
    return this.identite.id === operateurId;
  }

  id(): string {
    return this.identite.id;
  }

  assertPoste(posteId: string): void {
    this.habilitations.require(posteId);
  }
}
