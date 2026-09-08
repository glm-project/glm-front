import { Matricule } from './Matricule';
import { PosteHabilite } from './PosteHabilite';

export class Operateur {
  constructor(
    readonly id: string,
    readonly nom: string,
    readonly prenom: string,
    readonly postes: readonly PosteHabilite[],
    private readonly matricule: Matricule,
  ) {}

  matchesCode(code: string): boolean {
    return this.matricule.answersTo(code);
  }
}
