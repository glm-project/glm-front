const UN_CHIFFRE = /^\d$/;

export class Matricule {
  private constructor(private readonly valeur: string) {}

  static empty(): Matricule {
    return new Matricule('');
  }

  static of(valeur: string): Matricule {
    return new Matricule(valeur);
  }

  static accepts(caractere: string): boolean {
    return UN_CHIFFRE.test(caractere);
  }

  afterDigit(digit: string): Matricule {
    return new Matricule(`${this.valeur}${digit}`);
  }

  afterErasing(): Matricule {
    return new Matricule(this.valeur.slice(0, -1));
  }

  isEmpty(): boolean {
    return this.valeur.length === 0;
  }

  identifies(candidat: string | undefined): boolean {
    return this.valeur === candidat;
  }

  equals(other: Matricule | undefined): boolean {
    return this.valeur === other?.valeur;
  }

  toString(): string {
    return this.valeur;
  }
}
