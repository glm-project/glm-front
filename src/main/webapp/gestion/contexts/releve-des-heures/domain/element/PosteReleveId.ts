export class PosteReleveId {
  constructor(readonly value: string) {}

  estLeMeme(autre: PosteReleveId): boolean {
    return this.value === autre.value;
  }
}
