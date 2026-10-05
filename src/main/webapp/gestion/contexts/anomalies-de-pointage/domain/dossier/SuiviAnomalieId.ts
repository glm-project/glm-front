export class SuiviAnomalieId {
  constructor(readonly suivi: string) {}

  equals(other: SuiviAnomalieId): boolean {
    return this.suivi === other.suivi;
  }
}
