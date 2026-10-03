export class PointageConflitId {
  constructor(readonly pointage: string) {}

  equals(other: PointageConflitId): boolean {
    return this.pointage === other.pointage;
  }
}
