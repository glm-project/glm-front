export class OperateurCite {
  constructor(
    readonly id: string,
    readonly prenom: string | undefined,
    readonly nom: string | undefined,
  ) {}

  estNomme(): boolean {
    return this.nom !== undefined;
  }
}
