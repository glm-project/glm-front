export class Page<T> {
  constructor(
    readonly elements: readonly T[],
    readonly totalCount: number,
  ) {}
}
