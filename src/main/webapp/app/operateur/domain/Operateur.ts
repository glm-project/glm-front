import { PosteHabilite } from './PosteHabilite';

export class Operateur {
  constructor(
    readonly id: string,
    readonly nom: string,
    readonly prenom: string,
    readonly postes: readonly PosteHabilite[],
    private readonly matricule?: string,
  ) {}

  matchesCode(code: string): boolean {
    return this.matricule === code;
  }
}
