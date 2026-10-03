export class SuiviConflitId {
  constructor(readonly suivi: string) {}

  equals(other: SuiviConflitId): boolean {
    return this.suivi === other.suivi;
  }
}
