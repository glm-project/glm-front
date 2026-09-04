export class Extrait<T> {
  constructor(
    readonly elements: readonly T[],
    readonly nombreTotal: number,
  ) {}

  estComplet(): boolean {
    return this.elements.length === this.nombreTotal;
  }
}
