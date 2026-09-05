export class Page<T> {
  constructor(
    readonly elements: readonly T[],
    readonly totalCount: number,
  ) {}

  isComplete(): boolean {
    return this.elements.length === this.totalCount;
  }
}
