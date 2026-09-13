import { Matricule } from './Matricule';
import { PosteHabilite } from './PosteHabilite';

export interface DefinitionOperateur {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly postes: readonly PosteHabilite[];
  readonly matricule: Matricule;
}

export class Operateur {
  readonly id: string;
  readonly nom: string;
  readonly prenom: string;
  readonly postes: readonly PosteHabilite[];
  private readonly matricule: Matricule;

  constructor(definition: DefinitionOperateur) {
    this.id = definition.id;
    this.nom = definition.nom;
    this.prenom = definition.prenom;
    this.postes = definition.postes;
    this.matricule = definition.matricule;
  }

  matchesCode(code: string): boolean {
    return this.matricule.answersTo(code);
  }
}
