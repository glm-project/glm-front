export class ElementReleveId {
  constructor(readonly value: string) {}

  estLeMeme(autre: ElementReleveId): boolean {
    return this.value === autre.value;
  }
}
