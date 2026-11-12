export class PointageDuDossierId {
  constructor(readonly value: string) {}

  equals(other: PointageDuDossierId): boolean {
    return this.value === other.value;
  }
}
