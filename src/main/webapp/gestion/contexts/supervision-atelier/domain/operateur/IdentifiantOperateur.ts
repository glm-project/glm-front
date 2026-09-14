export class IdentifiantOperateur {
  constructor(readonly value: string) {}

  equals(other: IdentifiantOperateur): boolean {
    return this.value === other.value;
  }
}
