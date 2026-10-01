import { OperateurDuPupitre, TypeDOuverture } from '../../journal-du-pupitre/JournalDuPupitre';
import { Identifiant } from '../Identifiant';
import { DecisionDOuverture, HabilitationsDePoste } from './HabilitationsDePoste';

export interface IdentiteOperateurDesigne {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly identifiant: string;
}

export class OperateurDesigne {
  private readonly identite: IdentiteOperateurDesigne;
  private readonly habilitations: HabilitationsDePoste;

  constructor(source: OperateurDuPupitre, code: Identifiant) {
    this.identite = { id: source.id, nom: source.nom, prenom: source.prenom, identifiant: code.toString() };
    this.habilitations = HabilitationsDePoste.from(source.postes);
  }

  identity(): IdentiteOperateurDesigne {
    return this.identite;
  }

  decideOuverture(type: TypeDOuverture): DecisionDOuverture {
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
