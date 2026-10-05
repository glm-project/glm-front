export class OperateurAnomalieId {
  constructor(readonly operateur: string) {}

  equals(other: OperateurAnomalieId): boolean {
    return this.operateur === other.operateur;
  }
}
