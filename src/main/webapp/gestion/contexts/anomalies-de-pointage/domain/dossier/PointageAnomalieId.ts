export class PointageAnomalieId {
  constructor(readonly pointage: string) {}

  equals(other: PointageAnomalieId): boolean {
    return this.pointage === other.pointage;
  }
}
