export class PosteAnomalieId {
  constructor(readonly poste: string) {}

  equals(other: PosteAnomalieId): boolean {
    return this.poste === other.poste;
  }
}
