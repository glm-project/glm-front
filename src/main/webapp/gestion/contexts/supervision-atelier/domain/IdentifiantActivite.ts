export class IdentifiantActivite {
  constructor(readonly value: string) {}
  equals(other: IdentifiantActivite): boolean {
    return this.value === other.value;
  }
}
