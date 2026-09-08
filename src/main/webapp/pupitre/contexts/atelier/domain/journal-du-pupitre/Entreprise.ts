export class Entreprise {
  private constructor(private readonly nom: string) {}

  static of(nom: string): Entreprise {
    return new Entreprise(nom);
  }

  static from(nom: string | undefined): Entreprise | undefined {
    return nom === undefined ? undefined : Entreprise.of(nom);
  }

  static same(left: Entreprise | undefined, right: Entreprise | undefined): boolean {
    return left?.nom === right?.nom;
  }

  toString(): string {
    return this.nom;
  }
}
