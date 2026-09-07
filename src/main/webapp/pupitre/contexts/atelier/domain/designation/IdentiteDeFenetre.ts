export class IdentiteDeFenetre {
  constructor(private readonly generation: number) {}

  next(): IdentiteDeFenetre {
    return new IdentiteDeFenetre(this.generation + 1);
  }

  equals(other: IdentiteDeFenetre): boolean {
    return this.generation === other.generation;
  }
}
