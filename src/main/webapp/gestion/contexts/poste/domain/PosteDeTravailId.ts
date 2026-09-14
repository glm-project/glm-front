export class PosteDeTravailId {
  constructor(readonly value: string) {}

  equals(other: PosteDeTravailId | undefined): boolean {
    return other !== undefined && this.value === other.value;
  }
}
