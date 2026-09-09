export class Matricule {
  constructor(private readonly valeur: string | undefined) {}

  answersTo(code: string): boolean {
    return this.valeur === code;
  }
}
